import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent } from '~/src/lib/notify.js'
import { extractPaymentDetails } from '~/src/service/mappers/formatters/shared.js'
import { formatter as userAnswersFormatter } from '~/src/service/mappers/formatters/user/v1.js'

/**
 * Generates the payment success section for the form filler email
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {Translator} translator
 * @returns {string}
 */
function getPaymentSection(formSubmissionMessage, translator) {
  const paymentDetails = extractPaymentDetails(
    formSubmissionMessage,
    translator
  )

  if (!paymentDetails) {
    return ''
  }

  const { t } = translator

  return `
# ${t('confirmationEmail.paymentSuccess', { amount: paymentDetails.amount })}
## ${t('confirmationEmail.paymentFor')}
${escapeContent(paymentDetails.description)}
## ${t('confirmationEmail.totalAmount')}
${paymentDetails.amount}
## ${t('confirmationEmail.dateOfPayment')}
${escapeContent(paymentDetails.dateOfPayment)}
---
`
}

/**
 * @param {string} formName
 * @param {Date} submissionDate
 * @param {FormMetadata} metadata
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {Translator} translator
 */
export function getUserConfirmationEmailBody(
  formName,
  submissionDate,
  metadata,
  formSubmissionMessage,
  formDefinition,
  translator
) {
  const { t, tForm, language } = translator

  const formattedSubmissionDate = `${dateFormat(submissionDate, 'h:mmaaa', language)} ${t('confirmationEmail.on')} ${dateFormat(submissionDate, 'eeee d MMMM yyyy', language)}`

  const { submissionGuidance, organisation, contact } = metadata

  const phoneDetails = contact?.phone ? `${tForm('contact.phone')}\n\n` : ''
  const emailDetails = contact?.email
    ? `[${tForm('contact.email.address')}](mailto:${tForm('contact.email.address')})\n${tForm('contact.email.responseTime')}\n\n`
    : ''
  const onlineDetails = contact?.online
    ? `[${tForm('contact.online.text')}](${tForm('contact.online.url')})\n\n`
    : ''
  const contactDetails = `${phoneDetails}${emailDetails}${onlineDetails}`

  const referenceNumber = formDefinition.options?.showReferenceNumber
    ? `${t('confirmationEmail.referenceNumber', { referenceNumber: formSubmissionMessage.meta.referenceNumber })}\n\n`
    : ''

  // Generate the answers section if submission data is provided
  let answersSection = ''
  const formattedAnswers = userAnswersFormatter(
    formSubmissionMessage,
    formDefinition,
    translator
  )
  if (formattedAnswers) {
    answersSection = `
---
${formattedAnswers}
`
  }

  // Generate payment section if payment exists
  const paymentSection = getPaymentSection(formSubmissionMessage, translator)

  const submissionGuidanceText = submissionGuidance
    ? tForm('submissionGuidance')
    : undefined
  const submissionGuidancePlaceholderText = t(
    'confirmationEmail.whatHappensNextPlaceholder'
  )

  return `
# ${t('confirmationEmail.heading')}
${referenceNumber}${t('confirmationEmail.receivedAt', { formName: escapeContent(formName), submissionDateTime: formattedSubmissionDate })}
${paymentSection}
# ${t('confirmationEmail.whatHappensNext')}
${submissionGuidanceText ?? submissionGuidancePlaceholderText}

# ${t('confirmationEmail.getHelp')}
${contactDetails}

# ${t('confirmationEmail.yourAnswers')}
${t('confirmationEmail.answersFooter')}

${t('confirmationEmail.doNotReply')}

${t('confirmationEmail.from', { organisation: escapeContent(organisation) })}
${answersSection}
`
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 */
