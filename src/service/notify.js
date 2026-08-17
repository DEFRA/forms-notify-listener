import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/engine/types/enums.js'

import { logger } from '~/src/helpers/logging/logger.js'
import { sendNotifyEmailsLegacy } from '~/src/service/notify-legacy.js'
import { sendNotifyEmailsForTargets } from '~/src/service/notify-targets.js'

export {
  createAndPopulatei18nInstance,
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

/**
 * Whether this submission carries its own resolved recipient list.
 *
 * Gated on the declared schema version rather than on whether
 * `notificationTargets` happens to be present. The message schema requires the
 * property from V2 onwards, so a V2 message that somehow arrived without it
 * should fail rather than be quietly mistaken for an older message and
 * have its recipients resolved from the current form definition instead.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {boolean}
 */
export function hasResolvedNotificationTargets(formSubmissionMessage) {
  return (
    formSubmissionMessage.meta.schemaVersion >=
    FormAdapterSubmissionSchemaVersion.V2
  )
}

/**
 * Sends one or more mails to GovNotify.
 *
 * Submissions published from `FormAdapterSubmissionSchemaVersion.V2` onwards
 * carry a `notificationTargets` list, resolved at submission time with any
 * output conditions already evaluated, and are delivered per-address with
 * retries and requeueing - see `notify-targets.js`.
 *
 * Older submissions, which may still be in flight or sitting on the dead-letter
 * queue, have their recipients recovered from the form definition instead - see
 * `notify-legacy.js`.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmails(formSubmissionMessage) {
  if (hasResolvedNotificationTargets(formSubmissionMessage)) {
    return sendNotifyEmailsForTargets(formSubmissionMessage)
  }

  logger.info(
    ['submit', 'email', 'legacy'],
    `Submission ${formSubmissionMessage.meta.referenceNumber} predates resolved notification targets - resolving recipients from the form definition`
  )

  return sendNotifyEmailsLegacy(formSubmissionMessage)
}

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
