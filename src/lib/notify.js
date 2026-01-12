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
  - escapeContent: use this to escape everything that isn't a filename or file label.
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
 * Advanced escape function for Markdown content with the following rules:
 * - A `-` or `*` or `#` character at the start of a line is escaped with a backslash.
 * - Tab characters are replaced with 4 HTML encoded spaces (`&nbsp;`).
 * - A `-` character surrounded by spaces or tabs has those spaces or tabs replaced with HTML encoded spaces (`&nbsp;`).
 * - ``` being the only content on a single line is replaced with ` ` `
 * - Where a period `.` or comma `,` has a leading space or tab character, the space is converted to `&nbsp;` and tabs to 4 `&nbsp;`.
 * - Where a Markdown link is present (`[text](url)`), a space is inserted between the square brackets and round brackets.
 * @param {string} str - Gracefully handles null, undefined and non-string values.
 * @returns {string}
 */
export function escapeContent(str) {
  if (!validation.isString(str)) {
    return ''
  }

  // Process line by line to handle start-of-line rules
  const lines = str.split('\n')
  const processedLines = lines.map((line) => {
    // Rule: ``` being the only content on a single line is replaced with ` ` `
    if (line.trim() === '```') {
      return line.replace('```', '` ` `')
    }

    // Rule: A `-` or `*` or `#` character at the start of a line is escaped with a backslash
    const processedLine = line.replace(/^([-*#])/, String.raw`\$1`)

    return processedLine
  })

  let result = processedLines.join('\n')

  // Rule: Tab characters are replaced with 4 HTML encoded spaces
  // (Must be done before the hyphen-surrounded-by-whitespace rule)
  result = result.replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')

  // Rule: A `-` character surrounded by spaces or tabs has those replaced with &nbsp;
  // Since tabs are already converted, we now handle spaces around hyphens
  // Match space(s) or &nbsp; sequences around a hyphen
  // Note: Uses character class [ \u00A0] (space or non-breaking space) to avoid ReDoS vulnerability
  // that would occur with alternation like ( |&nbsp;)+
  result = result.replaceAll(/[ \u00A0]+-[ \u00A0]+/g, (match) => {
    return match.replaceAll(' ', '&nbsp;')
  })

  // Rule: Where a period `.` or comma `,` has a leading space or tab character,
  // the space is converted to &nbsp; (tabs already converted above)
  result = result.replaceAll(/ ([.,])/g, '&nbsp;$1')

  // Rule: Where a Markdown link is present, insert space between ] and (
  // Match [text](url) pattern and convert to [text] (url)
  // Also handle HTML entity encoded brackets: &rsqb; (]) and &lpar; (()
  result = result.replaceAll(/](\()/g, '] (')
  result = result.replaceAll(/&rsqb;(&lpar;)/gi, '&rsqb; &lpar;')

  return result
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
