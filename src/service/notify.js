import { logger } from '~/src/helpers/logging/logger.js'
import { sendNotifyEmailsForConditions } from '~/src/service/notify-conditions.js'
import { sendNotifyEmailsLegacy } from '~/src/service/notify-legacy.js'

export {
  createAndPopulatei18nInstance,
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

/**
 * Whether this submission records how its form's conditions evaluated.
 *
 * Gated on the property being present rather than on the message's schema
 * version, because the version says nothing about it: every message published
 * since conditional email support was added carries the property - empty when
 * the form has no V2 conditions to report - and no message published before it
 * does.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {boolean}
 */
export function hasConditionEvaluations(formSubmissionMessage) {
  return Array.isArray(formSubmissionMessage.conditionEvaluations)
}

/**
 * Sends one or more mails to GovNotify.
 *
 * Submissions carrying `conditionEvaluations` have their recipients resolved
 * from the form definition, with each output's condition judged on the outcome
 * the engine recorded at submission time - see `notify-conditions.js`.
 *
 * Older submissions, which may still be in flight or sitting on the dead-letter
 * queue, carry no such record, so every output is sent to regardless of its
 * condition - see `notify-legacy.js`.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmails(formSubmissionMessage) {
  if (hasConditionEvaluations(formSubmissionMessage)) {
    return sendNotifyEmailsForConditions(formSubmissionMessage)
  }

  logger.info(
    ['submit', 'email', 'legacy'],
    `Submission ${formSubmissionMessage.meta.referenceNumber} predates recorded condition outcomes - sending to every output in the form definition`
  )

  return sendNotifyEmailsLegacy(formSubmissionMessage)
}

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
