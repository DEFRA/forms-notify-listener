import { isFeedbackForm, replaceCustomControllers } from '@defra/forms-model'

import { getFormDefinition } from '~/src/lib/manager.js'
import {
  sendInternalEmail,
  sendUserConfirmationEmail
} from '~/src/service/notify-shared.js'

/**
 * Sends one or more mails to GovNotify, resolving the recipients from the live
 * form definition.
 *
 * This is the behaviour used for every submission published before
 * `FormAdapterSubmissionSchemaVersion.V2`. Such messages carry no
 * `notificationTargets`, so the addresses have to be recovered from the form
 * definition as it stands *now* rather than as it stood at submission time.
 *
 * It is kept deliberately unchanged - including the sequential sends and the
 * lack of retries - so that in-flight V1 messages behave exactly as they did
 * before conditional email support was added. Nothing new should be added here;
 * see `notify-targets.js` for the current path.
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
