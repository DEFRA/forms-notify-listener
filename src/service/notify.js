import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'

import { config } from '~/src/config/index.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'

// @ts-expect-error - incorrect typings in convict
const templateId = /** @type {string} */ (config.get('notifyTemplateId'))

const logger = createLogger()

/**
 * Sends a mail to notify
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmail(formSubmissionMessage) {
  const {
    formName: formNameInput,
    formId,
    notificationEmail: emailAddress,
    status,
    isPreview,
    versionMetadata
  } = formSubmissionMessage.meta
  const logTags = ['submit', 'email']

  // Get submission email personalisation
  logger.info(logTags, 'Getting personalisation data')

  const definition = await getFormDefinition(
    formId,
    status,
    versionMetadata?.versionNumber
  )

  const formName = escapeMarkdown(formNameInput)
  const subject = isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const outputAudience = definition.output?.audience ?? 'human'
  const schemaVersion = definition.output?.version ?? '1'

  const outputFormatter = getFormatter(outputAudience, schemaVersion)
  let body = outputFormatter(formSubmissionMessage, definition, schemaVersion)

  // GOV.UK Notify transforms quotes into curly quotes, so we can't just send the raw payload
  // This is logic specific to Notify, so we include the logic here rather than in the formatter
  if (outputAudience === 'machine') {
    body = Buffer.from(body).toString('base64')
  }

  logger.info(logTags, 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation: {
        subject,
        body
      }
    })

    logger.info(logTags, 'Email sent successfully')
  } catch (err) {
    const errMsg = getErrorMessage(err)
    logger.error(
      `[emailSendFailed] Error sending notification email - templateId: ${templateId} - recipient: ${emailAddress} - ${errMsg}`
    )

    throw err
  }
}
/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
