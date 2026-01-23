import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent } from '~/src/lib/notify.js'
import { formatter as userAnswersFormatter } from '~/src/service/mappers/formatters/user/v1.js'

const submisionGuidancePlaceholder =
  "Define this text in the 'What happens next' section of the form overview"

/**
 * Extracts payment details from the submission message if a payment exists
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {{ description: string, amount: number, dateOfPayment: string } | undefined}
 */
function extractPaymentDetails(formSubmissionMessage) {
  const { payments } = formSubmissionMessage.data

  if (!payments || Object.keys(payments).length === 0) {
    return undefined
  }

  // Get the first payment (forms typically have one payment)
  const paymentKey = Object.keys(payments)[0]
  const payment = payments[paymentKey]

  if (!payment) {
    return undefined
  }

  // Format the date of payment
  let dateOfPayment = ''
  if (payment.createdAt) {
    const date = new Date(payment.createdAt)
    dateOfPayment = `${dateFormat(date, 'h:mmaaa')} on ${dateFormat(date, 'd MMMM yyyy')}`
  }

  return {
    description: payment.description,
    amount: payment.amount,
    dateOfPayment
  }
}

/**
 * Generates the payment success section for the form filler email
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string}
 */
function getPaymentSection(formSubmissionMessage) {
  const paymentDetails = extractPaymentDetails(formSubmissionMessage)

  if (!paymentDetails) {
    return ''
  }

  return `
# Your payment of £${paymentDetails.amount} was successful
## Payment for
${escapeContent(paymentDetails.description)}
## Total amount
£${paymentDetails.amount}
## Date of payment
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
 */
export function getUserConfirmationEmailBody(
  formName,
  submissionDate,
  metadata,
  formSubmissionMessage,
  formDefinition
) {
  const formattedSubmissionDate = `${dateFormat(submissionDate, 'h:mmaaa')} on ${dateFormat(submissionDate, 'eeee d MMMM yyyy')}`

  const { submissionGuidance, organisation, contact } = metadata

  const phoneDetails = contact?.phone ? `${contact.phone}\n\n` : ''
  const emailDetails = contact?.email
    ? `[${contact.email.address}](mailto:${contact.email.address})\n${contact.email.responseTime}\n\n`
    : ''
  const onlineDetails = contact?.online
    ? `[${contact.online.text}](${contact.online.url})\n\n`
    : ''
  const contactDetails = `${phoneDetails}${emailDetails}${onlineDetails}`

  const referenceNumber = formDefinition.options?.showReferenceNumber
    ? `^ Your reference number: ${formSubmissionMessage.meta.referenceNumber}\n\n`
    : ''

  // Generate the answers section if submission data is provided
  let answersSection = ''
  const formattedAnswers = userAnswersFormatter(
    formSubmissionMessage,
    formDefinition
  )
  if (formattedAnswers) {
    answersSection = `
---
${formattedAnswers}
`
  }

  // Generate payment section if payment exists
  const paymentSection = getPaymentSection(formSubmissionMessage)

  return `
# Form submitted
${referenceNumber}We received your form submission for &lsquo;${escapeContent(formName)}&rsquo; at ${formattedSubmissionDate}.
${paymentSection}
## What happens next
${submissionGuidance ?? submisionGuidancePlaceholder}

## Get help
${contactDetails}

## Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From ${escapeContent(organisation)}
${answersSection}
`
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
