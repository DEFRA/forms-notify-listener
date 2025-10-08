import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'
import { ControllerType, getErrorMessage } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'
import { getUserConfirmationEmailBody } from '~/src/service/mappers/user-confirmation.js'

// @ts-expect-error - incorrect typings in convict
const templateId = /** @type {string} */ (config.get('notifyTemplateId'))

const logger = createLogger()

// TODO - need a better way to handle custom controllers in the output formatters
/**
 * Revert any custom controllers to their parent/base class since engine-plugin has no knowledge of them
 * @param {FormDefinition} definition
 * @returns {FormDefinition}
 */
export function removeCustomControllers(definition) {
  return {
    ...definition,
    pages: definition.pages.map((page) => {
      if (page.controller) {
        const controller = [
          'SummaryPageWithConfirmationEmailController'
        ].includes(page.controller)
          ? ControllerType.Summary
          : page.controller
        return /** @type {Page} */ ({
          ...page,
          controller
        })
      }
      return page
    })
  }
}

/**
 * Sends a mail to notify
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmails(formSubmissionMessage) {
  await sendInternalEmail(formSubmissionMessage)
  await sendUserConfirmationEmail(formSubmissionMessage)
}

/**
 * Sends an internal email to notify (to the form's submission inbox)
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendInternalEmail(formSubmissionMessage) {
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
  logger.info(
    logTags,
    'Getting personalisation data - internal submission email'
  )

  logger.debug(
    `Getting form definition: ${formId} version: ${versionMetadata?.versionNumber} - internal submission email`
  )

  const origDefinition = await getFormDefinition(
    formId,
    status,
    versionMetadata?.versionNumber
  )

  const definition = removeCustomControllers(origDefinition)

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

  logger.info(logTags, 'Sending internal submission email')

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

    logger.info(logTags, 'Internal submission email sent successfully')
  } catch (err) {
    const errMsg = getErrorMessage(err)
    logger.error(
      err,
      `[emailSendFailed] Error sending internal submission email - templateId: ${templateId} - ${errMsg}`
    )

    throw err
  }
}

/**
 * Sends a confirmation email to the submitting user
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendUserConfirmationEmail(formSubmissionMessage) {
  const {
    formId,
    formName: formNameInput,
    isPreview,
    custom
  } = formSubmissionMessage.meta

  const userConfirmationEmail = custom?.userConfirmationEmail

  if (!userConfirmationEmail) {
    return
  }

  const logTags = ['submit', 'email']

  // Get submission email personalisation
  logger.info(logTags, 'Getting personalisation data - user confirmation email')

  const formName = escapeMarkdown(formNameInput)

  const metadata = await getFormMetadata(formId)

  const subject = isPreview
    ? `TEST FORM CONFIRMATION: ${metadata.organisation}`
    : `Form submitted to ${metadata.organisation}`

  logger.info(logTags, 'Sending user confirmation email')

  if (!metadata.submissionGuidance) {
    throw new Error(`Missing submission guidance for form id ${formId}`)
  }

  try {
    // Send confirmation email
    await sendNotification({
      templateId,
      emailAddress: /** @type {string} */ (userConfirmationEmail),
      personalisation: {
        subject,
        body: getUserConfirmationEmailBody(formName, new Date(), metadata)
      }
    })

    logger.info(logTags, 'User confirmation email sent successfully')
  } catch (err) {
    const errMsg = getErrorMessage(err)
    logger.error(
      err,
      `[emailSendFailed] Error sending user confirmation email - templateId: ${templateId} - ${errMsg}`
    )

    throw err
  }
}

/**
 * @import { FormDefinition, Page } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
