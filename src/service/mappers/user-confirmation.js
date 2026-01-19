import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent } from '~/src/lib/notify.js'
import { formatter as userAnswersFormatter } from '~/src/service/mappers/formatters/user/v1.js'

const submisionGuidancePlaceholder =
  "Define this text in the 'What happens next' section of the form overview"

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
    ? `^ Your reference number: ${formSubmissionMessage.meta.referenceNumber}\n`
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

  return `
# Form submitted
${referenceNumber}We received your form submission for &lsquo;${escapeContent(formName)}&rsquo; at ${formattedSubmissionDate}.

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
