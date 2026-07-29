import { loadFormTranslations } from '@defra/forms-engine-plugin/engine/i18n/createFormTranslator.js'
import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'
import { extractBaseTranslations } from '@defra/forms-engine-plugin/engine/i18n/extractBaseTranslations.js'
import { isFeedbackForm, replaceCustomControllers } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getBoomErrorMessage } from '~/src/helpers/logging/error-helper.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { createFormI18nInstance } from '~/src/i18n/index.js'
import {
  EN_GB,
  storeMetadataBaseTranslations
} from '~/src/i18n/translations-helper.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'
import { getUserConfirmationEmailBody } from '~/src/service/mappers/user-confirmation.js'

const templateId = config.get('notifyTemplateId')
const notifyReplyToId = config.get('notifyReplyToId')

/**
 * Create an i18n instance and populate it with the necessary base info and form info,
 * ready for a translator to be overlaid
 * @param { FormMetadata | undefined } metadata
 * @param {FormDefinition} definition
 */
export function createAndPopulatei18nInstance(metadata, definition) {
  const baseTranslations = extractBaseTranslations(definition)
  const i18nInstance = createFormI18nInstance(baseTranslations)
  loadFormTranslations(definition, i18nInstance)
  storeMetadataBaseTranslations(metadata, i18nInstance)
  return i18nInstance
}

/**
 * Sends one or more mails to GovNotify
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {Promise<void>}
 */
export async function sendNotifyEmails(formSubmissionMessage) {
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
 * Sends an internal email to notify (to the form's submission inbox)
 * @param {FormDefinition} definition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {Output} output
 * @returns {Promise<void>}
 */
export async function sendInternalEmail(
  definition,
  formSubmissionMessage,
  output
) {
  const logTags = ['submit', 'email']

  const messageMeta = formSubmissionMessage.meta

  // Get submission email personalisation
  logger.info(logTags, 'Getting personalisation data - submission email')

  const formName = messageMeta.formName

  const subject = messageMeta.isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const i18nInstance = createAndPopulatei18nInstance(undefined, definition)
  const translator = createTranslator(i18nInstance, EN_GB)

  const outputFormatter = getFormatter(output.audience, output.version)
  let body = outputFormatter(
    formSubmissionMessage,
    definition,
    output.version,
    translator
  )

  // GOV.UK Notify transforms quotes into curly quotes, so we can't just send the raw payload
  // This is logic specific to Notify, so we include the logic here rather than in the formatter
  if (output.audience === 'machine') {
    body = Buffer.from(body).toString('base64')
  }

  logger.info(logTags, 'Sending internal submission email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress: output.emailAddress,
      personalisation: {
        subject,
        body
      }
    })

    logger.info(logTags, 'Internal submission email sent successfully')
  } catch (err) {
    const errMsg = getBoomErrorMessage(err)
    logger.error(
      err,
      `[emailSendFailed] Error sending internal submission email - messageId: ${formSubmissionMessage.messageId} - ${errMsg}`
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
  const meta = formSubmissionMessage.meta

  const userConfirmationEmail = /** @type { string | undefined } */ (
    meta.custom?.userConfirmationEmail
  )

  if (!userConfirmationEmail) {
    // Don't send confirmation email if no email address passed in the message
    return
  }

  const logTags = ['confirmation', 'email']

  // Get confirmation email personalisation
  logger.info(logTags, 'Getting personalisation data - user confirmation email')

  const formName = meta.formName

  const [formMetadata, definitionPreConverted] = await Promise.all([
    getFormMetadata(meta.formId),
    getFormDefinition(
      meta.formId,
      meta.status,
      meta.versionMetadata?.versionNumber
    )
  ])

  const definition = replaceCustomControllers(definitionPreConverted)

  const i18nInstance = createAndPopulatei18nInstance(formMetadata, definition)
  const translator = createTranslator(
    i18nInstance,
    formSubmissionMessage.meta.language
  )

  const subject = meta.isPreview
    ? translator.t('confirmationEmail.subjectTestMode', {
        organisation: formMetadata.organisation
      })
    : translator.t('confirmationEmail.subject', {
        organisation: formMetadata.organisation
      })

  logger.info(logTags, 'Sending user confirmation email')

  try {
    // Send confirmation email
    await sendNotification({
      templateId,
      emailAddress: userConfirmationEmail,
      personalisation: {
        subject,
        body: getUserConfirmationEmailBody(
          formName,
          meta.timestamp,
          formMetadata,
          formSubmissionMessage,
          definition,
          translator
        )
      },
      notifyReplyToId
    })

    logger.info(logTags, 'User confirmation email sent successfully')
  } catch (err) {
    const errMsg = getBoomErrorMessage(err)
    logger.error(
      err,
      `[emailSendFailed] Error sending user confirmation email - messageId: ${formSubmissionMessage.messageId} - ${errMsg}`
    )

    throw err
  }
}

/**
 * @import { FormDefinition, FormMetadata, Output } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
