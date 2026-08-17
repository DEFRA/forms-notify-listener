import { setTimeout as delay } from 'node:timers/promises'

import { isFeedbackForm, replaceCustomControllers } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { getBoomErrorMessage } from '~/src/helpers/logging/error-helper.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { republishEventMessage } from '~/src/messaging/event.js'
import {
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

const maxSendAttempts = config.get('notifyMaxSendAttempts')
const sendBackoffMs = config.get('notifySendBackoffMs')
const sendBudgetMs = config.get('notifySendBudgetMs')
const maxRequeues = config.get('notifyMaxRequeues')

/** Target that carries the "we've received your form" email back to the submitter */
export const TARGET_TYPE_CONFIRMATION = 'confirmation'

/**
 * GOV.UK Notify responses that will never succeed on a retry.
 *
 * 400 covers a rejected template, personalisation or recipient - notably an
 * address on the service's blocklist - and 403 covers a bad API key. Retrying
 * either just burns the budget. Everything else (429 rate limiting, 5xx, and
 * the 502/504 Boom errors Wreck raises for connection failures and timeouts) is
 * treated as transient.
 * @satisfies {number[]}
 */
const PERMANENT_NOTIFY_STATUS_CODES = [400, 403]

/**
 * Whether another attempt against this address stands any chance of working
 * @param {unknown} err
 * @returns {boolean}
 */
export function isRetryableSendError(err) {
  if (!Boom.isBoom(err)) {
    // Anything that isn't an HTTP response - a formatter blowing up, for
    // instance - is retried once or twice on the off chance it was transient
    return true
  }

  return !PERMANENT_NOTIFY_STATUS_CODES.includes(err.output.statusCode)
}

/**
 * Work out everything this submission still needs delivering to.
 *
 * The submission targets are resolved upstream by forms-engine-plugin, with any
 * output conditions already evaluated against the answers as they stood at
 * submission time. The confirmation target is not: forms-runner attaches the
 * submitter's address to `meta.custom` *after* the engine has formatted the
 * message, so it has to be folded in here. It is only added when one isn't
 * already present, otherwise a requeued message would grow a duplicate
 * confirmation target on every pass.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {FormAdapterNotificationTarget[]} a copy - safe to mutate
 */
export function buildNotificationTargetList(formSubmissionMessage) {
  const targets = (formSubmissionMessage.notificationTargets ?? []).map(
    (target) => ({ ...target })
  )

  const userConfirmationEmail = /** @type {string | undefined} */ (
    formSubmissionMessage.meta.custom?.userConfirmationEmail
  )

  const hasConfirmationTarget = targets.some(
    (target) => target.type === TARGET_TYPE_CONFIRMATION
  )

  if (userConfirmationEmail && !hasConfirmationTarget) {
    targets.push({
      emailAddress: userConfirmationEmail,
      // The confirmation email has its own template and formatter, so these two
      // are ignored for this target. They're set because the message schema
      // requires them on every entry.
      audience: 'human',
      version: '2',
      type: TARGET_TYPE_CONFIRMATION
    })
  }

  return targets
}

/**
 * Deliver a single target, retrying transient failures.
 *
 * `sent` and `sendAttempts` are recorded on the target itself so that a
 * requeued message can pick up where this one left off.
 * @param {FormAdapterNotificationTarget} target - mutated in place
 * @param {() => Promise<void>} send
 * @param {number} deadline - epoch milliseconds after which no further attempts are made
 * @returns {Promise<void>} rejects with the last error if every attempt failed
 */
export async function deliverTarget(target, send, deadline) {
  let lastError

  for (let attempt = 1; attempt <= maxSendAttempts; attempt++) {
    target.sendAttempts = (target.sendAttempts ?? 0) + 1

    try {
      await send()
      target.sent = true
      return
    } catch (err) {
      lastError = err

      const isLastAttempt = attempt === maxSendAttempts

      if (
        isLastAttempt ||
        !isRetryableSendError(err) ||
        Date.now() >= deadline
      ) {
        break
      }

      await delay(sendBackoffMs * attempt)
    }
  }

  throw lastError
}

/**
 * Sends a submission to every address it is still outstanding for.
 *
 * Used for messages at `FormAdapterSubmissionSchemaVersion.V2` and above, which
 * carry their own resolved recipient list. Targets are delivered in parallel,
 * each retried a few times on transient Notify failures, and then:
 *
 * - all delivered: the message is acknowledged and done with
 * - some delivered: the submission is put back on the queue carrying only the
 *   outstanding addresses, and this message is acknowledged. Nobody who already
 *   received it receives it again.
 * - none delivered: this throws, so the message is not acknowledged and SQS
 *   redelivers it until the redrive policy moves it to the dead-letter queue.
 *   Requeueing instead would replay forever when every address is unreachable.
 *
 * Failure counts are logged but addresses never are.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmailsForTargets(formSubmissionMessage) {
  const { meta } = formSubmissionMessage
  const logTags = ['submit', 'email', 'targets']
  const reference = meta.referenceNumber

  const definitionPreConverted = await getFormDefinition(
    meta.formId,
    meta.status,
    meta.versionMetadata?.versionNumber
  )

  if (isFeedbackForm(definitionPreConverted)) {
    // Dont send a submission email or a confirmation email if this is a feedback form
    return
  }

  const definition = replaceCustomControllers(definitionPreConverted)

  const targets = buildNotificationTargetList(formSubmissionMessage)
  const outstanding = targets.filter((target) => !target.sent)

  if (!outstanding.length) {
    logger.info(
      logTags,
      `No outstanding notification targets for submission ${reference}`
    )
    return
  }

  // Loaded once up front rather than per attempt, so retries don't hammer the
  // manager. Only fetched when there is actually a confirmation email to send.
  const confirmationContext = outstanding.some(
    (target) => target.type === TARGET_TYPE_CONFIRMATION
  )
    ? {
        formMetadata: await getFormMetadata(meta.formId),
        definition
      }
    : undefined

  logger.info(
    logTags,
    `Sending ${outstanding.length} notification email(s) for submission ${reference}`
  )

  const deadline = Date.now() + sendBudgetMs

  const results = await Promise.allSettled(
    outstanding.map((target) =>
      deliverTarget(
        target,
        () =>
          target.type === TARGET_TYPE_CONFIRMATION
            ? sendUserConfirmationEmail(
                formSubmissionMessage,
                confirmationContext
              )
            : sendInternalEmail(
                definition,
                formSubmissionMessage,
                /** @type {Output} */ (target)
              ),
        deadline
      )
    )
  )

  const failures = results.filter((result) => result.status === 'rejected')

  if (!failures.length) {
    logger.info(
      logTags,
      `Sent all ${outstanding.length} notification email(s) for submission ${reference}`
    )
    return
  }

  const failureReasons = failures
    .map((failure) => getBoomErrorMessage(failure.reason))
    .join(', ')

  if (failures.length === outstanding.length) {
    // Nothing got through, so there is no progress to preserve. Leave the
    // message unacknowledged and let the redrive policy take it to the DLQ.
    throw new Error(
      `[emailSendFailed] All ${outstanding.length} notification email(s) failed for submission ${reference} - ${failureReasons}`
    )
  }

  logger.error(
    `[emailSendPartialFailure] ${failures.length} of ${outstanding.length} notification email(s) failed for submission ${reference}, requeueing the outstanding addresses - ${failureReasons}`
  )

  await requeueOutstandingTargets(formSubmissionMessage, targets)
}

/**
 * Put the submission back on the queue carrying only what is still outstanding.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormAdapterNotificationTarget[]} targets - the full list, delivered entries flagged
 * @returns {Promise<void>}
 */
async function requeueOutstandingTargets(formSubmissionMessage, targets) {
  const { messageId, meta, data, result } = formSubmissionMessage

  const requeueCount = Number(meta.custom?.notifyRequeueCount ?? 0) + 1

  // Each requeue follows at least one successful send, so the outstanding list
  // strictly shrinks and this is unreachable in practice. It exists so that a
  // regression which dropped the `sent` flags would end up on the dead-letter
  // queue rather than cycling forever.
  if (requeueCount > maxRequeues) {
    throw new Error(
      `Submission ${meta.referenceNumber} has been requeued ${maxRequeues} times without delivering every notification - refusing to requeue again`
    )
  }

  /** @type {FormAdapterSubmissionMessagePayload} */
  const payload = {
    meta: {
      ...meta,
      custom: {
        ...meta.custom,
        notifyRequeueCount: requeueCount,
        notifyRequeuedFrom: messageId
      }
    },
    data,
    result,
    notificationTargets: targets
  }

  await republishEventMessage(messageId, JSON.stringify(payload))
}

/**
 * @import { Output } from '@defra/forms-model'
 * @import { FormAdapterNotificationTarget, FormAdapterSubmissionMessage, FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
