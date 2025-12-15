import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'

import { format as dateFormat } from '~/src/helpers/date.js'
import { formatter as userAnswersFormatter } from '~/src/service/mappers/formatters/user/v1.js'

const submisionGuidancePlaceholder =
  "Define this text in the 'What happens next' section of the form overview"

/**
 * @param {string} formName
 * @param {Date} submissionDate
 * @param {FormMetadata} metadata
 * @param {FormAdapterSubmissionMessage} [formSubmissionMessage]
 * @param {FormDefinition} [formDefinition]
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

  // Generate the answers section if submission data is provided
  let answersSection = ''
  if (formSubmissionMessage && formDefinition) {
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
  }

  return `
# We have your form
We received your form submission for &lsquo;${formName}&rsquo; on ${formattedSubmissionDate}.

## What happens next
${submissionGuidance ?? submisionGuidancePlaceholder}

## Your answers
Your answers are included at the end of this email.

## Get help
${contactDetails}Do not reply to this emall. We do not monitor replies to this email address.

From ${escapeMarkdown(organisation)}
${answersSection}
`
}

/**
 * @import { FormMetadata, FormDefinition } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
