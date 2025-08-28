import { sendNotification } from '@defra/forms-engine-plugin'
// import { escapeMarkdown } from '@defra/forms-engine-plugin/components/helpers.js'

import { config } from '~/src/config/index.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition } from '~/src/lib/manager.js'

const templateId = config.get('notifyTemplateId')

const logger = createLogger()

/**
 * Prevent Markdown formatting
 * @see {@link https://pandoc.org/chunkedhtml-demo/8.11-backslash-escapes.html}
 */
function escapeMarkdown(answer) {
  const punctuation = [
    '`',
    "'",
    '*',
    '_',
    '{',
    '}',
    '[',
    ']',
    '(',
    ')',
    '#',
    '+',
    '-',
    '.',
    '!'
  ]

  for (const character of punctuation) {
    answer = answer.toString().replaceAll(character, `\\${character}`)
  }

  return answer
}
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
    referenceNumber
  } = formSubmissionMessage.meta
  const logTags = ['submit', 'email']

  // Get submission email personalisation
  logger.info(logTags, 'Getting personalisation data')

  const definition = await getFormDefinition(formId, status)
  const formName = escapeMarkdown(formNameInput)
  const subject = isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const outputAudience = definition.output?.audience ?? 'human'
  const schemaVersion = definition.output?.version ?? '1'

  const machineReadable = {
    meta: {
      schemaVersion,
      timestamp: new Date().toISOString(),
      referenceNumber,
      definition
    },
    data: formSubmissionMessage.data
  }
  let body = JSON.stringify(machineReadable)
  // TODO - format email
  // TODO - human readable
  // TODO - machine readable
  // TODO - send notification

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
      errMsg,
      `[emailSendFailed] Error sending notification email - templateId: ${templateId} - recipient: ${emailAddress} - ${errMsg}`
    )

    throw err
  }
}
/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/types'
 */
