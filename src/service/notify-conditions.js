import {
  ConditionEvaluationOutcome,
  isFeedbackForm,
  replaceCustomControllers
} from '@defra/forms-model'

import { getBoomErrorMessage } from '~/src/helpers/logging/error-helper.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import {
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

/**
 * The audience and version the notification email falls back to when the
 * definition has no `output` block.
 *
 * An output always carries its own audience and version, so this only ever
 * decides the format of the fallback address. It matches the fallback the
 * legacy path applies, so that a form with no explicit `output` is sent
 * against the same template on both paths.
 * @see {@link file://./notify-legacy.js}
 * @satisfies {Pick<Output, 'audience' | 'version'>}
 */
const DEFAULT_OUTPUT = { audience: 'human', version: '2' }

/**
 * Whether an output should receive this submission.
 *
 * An output with no condition is unconditional. An output whose condition was
 * not evaluated at submission, or which evaluated to anything other than
 * `true`, does not qualify: the gate the author put on that address cannot be
 * shown to have passed, and sending anyway would leak the submission to a
 * recipient who was meant to be filtered out.
 *
 * The message and the definition are pinned to the same version, so a missing
 * evaluation means the engine did not evaluate a condition the definition
 * names: the output references a condition id that does not resolve, the
 * condition is not a V2 condition wrapper, or the submission came from a
 * V1-engine form, which reports no outcomes at all. It is logged as an error.
 * @param {Output} output
 * @param {Map<string, ConditionEvaluationOutcome>} outcomes
 * @param {string} formId
 * @returns {boolean}
 */
function outputQualifies(output, outcomes, formId) {
  if (!output.condition) {
    return true
  }

  const outcome = outcomes.get(output.condition)

  if (outcome === undefined) {
    logger.error(
      `Form ${formId} has an output conditioned on "${output.condition}", which was not evaluated for this submission. The output has been excluded.`
    )

    return false
  }

  return outcome === ConditionEvaluationOutcome.True
}

/**
 * Works out which of the form's outputs this submission should be sent to.
 *
 * Conditions are not evaluated here - they were evaluated by the engine
 * against the answers as they stood at submission, and their outcomes travel
 * on the message. Re-evaluating them would require the walked evaluation
 * state that produced them, which this service does not hold: it receives the
 * flat submitted answers, not the traversal that produced them.
 *
 * Outputs take over from the notification email entirely: the notification
 * email ("Submitted forms sent to") is only a fallback, so that a form with no
 * outputs, or one whose outputs are all gated behind conditions that did not
 * pass, still has somewhere to go rather than being dropped.
 *
 * Outputs are deduplicated on address, audience and version together, keeping
 * the first casing of the address seen. The definition rejects two outputs
 * matching on all of address, condition, audience and version, but not two
 * that differ only by condition and resolve to the same address here. The same
 * address may still legitimately receive both the human-readable and the
 * machine-processable output - those are two sends, and both are made.
 * @param {FormDefinition} definition
 * @param {SubmitConditionEvaluation[]} conditionEvaluations
 * @param {string} notificationEmail
 * @param {string} formId
 * @returns {Output[]}
 */
export function resolveSubmissionOutputs(
  definition,
  conditionEvaluations,
  notificationEmail,
  formId
) {
  const outcomes = new Map(
    conditionEvaluations.map((evaluation) => [
      evaluation.conditionId,
      evaluation.outcome
    ])
  )

  /** @type {Map<string, Output>} */
  const resolved = new Map()

  /**
   * @param {string | undefined} emailAddress
   * @param {OutputAudience} audience
   * @param {string} version
   */
  const add = (emailAddress, audience, version) => {
    if (emailAddress) {
      const key = `${emailAddress.toLowerCase()}|${audience}|${version}`

      if (!resolved.has(key)) {
        resolved.set(key, { emailAddress, audience, version })
      }
    }
  }

  for (const output of definition.outputs ?? []) {
    if (outputQualifies(output, outcomes, formId)) {
      add(output.emailAddress, output.audience, output.version)
    }
  }

  // The notification email is only wanted when there is nowhere else to send
  // the submission
  if (!resolved.size) {
    add(
      notificationEmail,
      definition.output?.audience ?? DEFAULT_OUTPUT.audience,
      definition.output?.version ?? DEFAULT_OUTPUT.version
    )
  }

  return [...resolved.values()]
}

/**
 * Sends a submission to every address its form definition resolves to.
 *
 * Used for messages carrying `conditionEvaluations` - the outcome of every
 * condition in the form definition at the point of submission. Those outcomes
 * plus the definition are enough to work out which outputs qualify, so the
 * message itself does not have to carry the recipient list.
 *
 * Every email - the submission emails and the submitter's confirmation - is
 * sent in parallel, and any failure fails the whole submission. The message is
 * then left unacknowledged, so SQS redelivers it and the redrive policy
 * eventually moves it to the dead-letter queue. Redelivery resends to every
 * address, including any that succeeded, because nothing records who already
 * received it: a duplicate email is preferable to a recipient silently never
 * getting the submission at all.
 *
 * Failure counts are logged but addresses never are.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmailsForConditions(formSubmissionMessage) {
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

  const outputs = resolveSubmissionOutputs(
    definition,
    formSubmissionMessage.conditionEvaluations ?? [],
    meta.notificationEmail,
    meta.formId
  )

  const userConfirmationEmail = /** @type {string | undefined} */ (
    meta.custom?.userConfirmationEmail
  )

  // Loaded once up front rather than inside the send, so the definition is not
  // fetched from the manager a second time. Only loaded when there is actually
  // a confirmation email to send.
  const confirmationContext = userConfirmationEmail
    ? { formMetadata: await getFormMetadata(meta.formId), definition }
    : undefined

  /** @type {Promise<void>[]} */
  const sends = outputs.map((output) =>
    sendInternalEmail(definition, formSubmissionMessage, output)
  )

  if (confirmationContext) {
    sends.push(
      sendUserConfirmationEmail(formSubmissionMessage, confirmationContext)
    )
  }

  if (!sends.length) {
    logger.info(logTags, `No notification emails to send for ${reference}`)
    return
  }

  logger.info(
    logTags,
    `Sending ${sends.length} notification email(s) for submission ${reference}`
  )

  const results = await Promise.allSettled(sends)
  const failures = results.filter((result) => result.status === 'rejected')

  if (failures.length) {
    const failureReasons = failures
      .map((failure) => getBoomErrorMessage(failure.reason))
      .join(', ')

    // Nothing here records which addresses got through, so there is no partial
    // progress to preserve. Leave the message unacknowledged and let the
    // redrive policy take it to the DLQ.
    throw new Error(
      `[emailSendFailed] ${failures.length} of ${sends.length} notification email(s) failed for submission ${reference} - ${failureReasons}`
    )
  }

  logger.info(
    logTags,
    `Sent all ${sends.length} notification email(s) for submission ${reference}`
  )
}

/**
 * @import { FormDefinition, Output, OutputAudience, SubmitConditionEvaluation } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
