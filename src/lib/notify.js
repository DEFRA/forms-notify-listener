import { token } from '@hapi/jwt'

import { config } from '~/src/config/index.js'
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

/**
 * Notify auto-translates ASCII hyphens to en dashes, and strips whitespace (including tabs) before punctuation.
 * This method is used to escape each of these characters so Notify doesn't translate the content.
 * @param {string} str
 */
export function escapeNotifyContent(str) {
  return str
    .replaceAll('-', '&hyphen;')
    .replaceAll(' ', '&nbsp;')
    .replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
}

/**
 * @param {{ subject: string; body: string }} personalisation
 */
export function escapeNotifyPersonalisation(personalisation) {
  const { subject, body } = personalisation
  return {
    subject: escapeNotifyContent(subject),
    body: escapeNotifyContent(body)
  }
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

  const escapedPersonalisation = escapeNotifyPersonalisation(personalisation)

  return postJson(NOTIFICATIONS_URL, {
    payload: {
      template_id: templateId,
      email_address: emailAddress,
      personalisation: escapedPersonalisation,
      email_reply_to_id: notifyReplyToId
    },
    headers: {
      Authorization: 'Bearer ' + createToken(serviceId, apiKeyId)
    }
  })
}
