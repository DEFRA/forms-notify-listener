import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'
import { token } from '@hapi/jwt'

import { config } from '~/src/config/index.js'
import validation from '~/src/helpers/validation/basic-validators.js'
import { postJson } from '~/src/lib/fetch.js'

const notifyAPIKey = config.get('notifyAPIKey')

const API_KEY_SUBSTRING_REDUCTION = 36
const SERVICE_ID_SUBSTRING_REDUCTION = 73
const SERVICE_ID_SUBSTRING_REDUCTION_2 = 37

// Extract the two uuids from the notifyApiKey
// See https://github.com/alphagov/notifications-node-client/blob/main/client/api_client.js#L17
// Needed until `https://github.com/alphagov/notifications-node-client/pull/200` is published
const apiKeyId = /** @type {string} */ (
  notifyAPIKey.substring(
    notifyAPIKey.length - API_KEY_SUBSTRING_REDUCTION,
    notifyAPIKey.length
  )
)
const serviceId = /** @type {string} */ (
  notifyAPIKey.substring(
    notifyAPIKey.length - SERVICE_ID_SUBSTRING_REDUCTION,
    notifyAPIKey.length - SERVICE_ID_SUBSTRING_REDUCTION_2
  )
)

/**
 * @typedef {{
 *   templateId: string
 *   emailAddress: string
 *   personalisation: { subject: string; body: string }
 *   notifyReplyToId?: string
 * }} SendNotificationArgs
 */

/*
  The escaping methods below should be used for the following:
  - escapeFileLabel: used for the filename text value when used in the Markdown format of [<filename>](<url>) (escapes any spaces so Notify doesn’t translate anything)
  - escapeSingleLineAnswer: used to wrap any answer text in triple back-ticks. This ensures the content is escaped but things like URLs still remain usable. Only suitable for single lines of text.
  - escapeAnswer: used to characters contained within an answer which would otherwise be formatted as Markdown.
  - escapeSubject: used to escape email subject line by putting in backslashes since the subject line doesn’t render as HTML (whereas the body does render like HTML)
*/

/**
 * For escaping filenames and file labels.
 *
 * Notify auto-translates ASCII hyphens to en dashes (where used to split a sentence), and strips whitespace (including tabs)
 * before punctuation.
 * This method is used to escape each of these characters so Notify doesn't translate the content.
 *
 * NOTE: hyphens are not converted because we are forcing '&nbsp;' in the surrounding spaces (if any), therefore Notify doesn't think
 * it's a sentence break.
 * @param {string} str - Gracefully handles null, undefined and non-string values.
 */
export function escapeFileLabel(str) {
  if (!validation.isString(str)) {
    return ''
  }
  return str
    .replaceAll(' ', '&nbsp;')
    .replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
}

/**
 * Prevent Markdown formatting by marking content as a 'code block'.
 *
 * NOTE: Line breaks are NOT preserved by Notify when using this method and it should be used for single lines only.
 * Also, if you have two items immediately following each other which have been escaped using this method, then
 * Notify will cause them to appear on the same line.
 *
 * WARNING: Triple backticks in the answer will be replaced with three backticks each separated by a space.
 * @param {string|number} answer - Gracefully handles null and undefined values.
 */
export function escapeSingleLineAnswer(answer) {
  if (validation.isUndefinedOrNull(answer)) {
    return ''
  }

  if (validation.isNonEmptyString(answer)) {
    // Need to prevent the answer from ending the escape sequence in Notify.
    answer = answer.replaceAll('```', '` ` `')
  }

  return `\`\`\`\r\n${answer}\r\n\`\`\``
}

/**
 * Escapes the parts of an answer which would otherwise be formatted as Markdown.
 * @param {string} answer - Gracefully handles null, undefined and non-string values.
 * @returns {string}
 */
export function escapeAnswer(answer) {
  if (!validation.isString(answer)) {
    return ''
  }
  return escapeMarkdown(answer)
}

/**
 * Escapes a subject.
 *
 * Subjects are treated differently in Notify and different escaping rules apply.
 * @param {string} subject - Gracefully handles null, undefined and non-string values.
 * @returns {string}
 */
export function escapeSubject(subject) {
  return escapeAnswer(subject)
}

/**
 * @param {string} iss
 * @param {string} secret
 */
function createToken(iss, secret) {
  const iat = Math.round(Date.now() / 1000)

  return token.generate({ iss, iat }, secret, {
    header: { typ: 'JWT', alg: 'HS256' }
  })
}

const NOTIFICATIONS_URL = new URL(
  '/v2/notifications/email',
  'https://api.notifications.service.gov.uk'
)

/**
 * @param {SendNotificationArgs} args
 * @returns {Promise<{response: object, body: unknown}>}
 */
export async function sendNotification(args) {
  const { templateId, emailAddress, personalisation, notifyReplyToId } = args

  return postJson(NOTIFICATIONS_URL, {
    payload: {
      template_id: templateId,
      email_address: emailAddress,
      personalisation,
      email_reply_to_id: notifyReplyToId
    },
    headers: {
      Authorization: 'Bearer ' + createToken(serviceId, apiKeyId)
    }
  })
}
