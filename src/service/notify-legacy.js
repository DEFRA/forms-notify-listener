import { isFeedbackForm, replaceCustomControllers } from '@defra/forms-model'

import { getFormDefinition } from '~/src/lib/manager.js'
import {
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

/**
 * Sends one or more mails to GovNotify, sending to every output in the form
 * definition regardless of its condition.
 *
 * This is the behaviour used for every submission published before conditional
 * email support was added. Such messages carry no `conditionEvaluations`, so
 * there is no record of how the form's conditions stood at submission time and
 * no safe way to recover one - the answers on the message are flat, not the
 * walked evaluation context the engine judges conditions against.
 *
 * It is kept deliberately unchanged - including the notification email being
 * sent to *as well as* every output, rather than only as a fallback - so that
 * in-flight messages behave exactly as they did before. Nothing new should be
 * added here; see `notify-conditions.js` for the current path.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmailsLegacy(formSubmissionMessage) {
  const {
    formId,
    notificationEmail: emailAddress,
    status
  } = formSubmissionMessage.meta

  const definitionPreConverted = await getFormDefinition(
    formId,
    status,
    formSubmissionMessage.meta.versionMetadata?.versionNumber
  )

  if (isFeedbackForm(definitionPreConverted)) {
    // Dont send a submission email or a confirmation email if this is a feedback form
    return
  }

  const definition = replaceCustomControllers(definitionPreConverted)

  // Submission email targets are defined in either or both of:
  // - FormDefinition.output (with email address set in FormDefinition.outputEmail or in form metadata)
  // - FormDefinition.outputs (multiple rows are possible)
  const submissionOutputs = /** @type {Output[]} */ (
    [
      {
        audience: definition.output?.audience ?? 'human',
        version: definition.output?.version ?? '2',
        emailAddress
      }
    ].concat(definition.outputs ?? [])
  )

  // Submission emails
  for (const output of submissionOutputs) {
    await sendInternalEmail(definition, formSubmissionMessage, output)
  }

  // Confirmation email
  await sendUserConfirmationEmail(formSubmissionMessage)
}

/**
 * @import { Output } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
