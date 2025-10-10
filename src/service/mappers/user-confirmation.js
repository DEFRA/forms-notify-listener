import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'

import { format as dateFormat } from '~/src/helpers/date.js'

const submisionGuidancePlaceholder =
  "Define this text in the 'What happens next' section of the form overview"

/**
 * @param {string} formName
 * @param {Date} submissionDate
 * @param {FormMetadata} metadata
 */
export function getUserConfirmationEmailBody(
  formName,
  submissionDate,
  metadata
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

  return `
# We have your form
We received your form submission for &lsquo;${formName}&rsquo; on ${formattedSubmissionDate}.

## What happens next
${submissionGuidance ?? submisionGuidancePlaceholder}

## Get help
${contactDetails}Do not reply to this emall. We do not monitor reples to this email address.

From ${escapeMarkdown(organisation)}
`
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 */
