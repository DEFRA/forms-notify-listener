import { PublishCommand } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { getSNSClient } from '~/src/messaging/sns.js'

const snsTopicArn = config.get('emailsSnsTopicArn')

const client = getSNSClient()

/**
 * @typedef {{
 *  source: string
 *  reason: string
 *  templateId: string
 *  emailAddress: string
 *  personalisation: { subject: string; body: string }
 *  notifyReplyToId?: string
 * }} EmailQueueMessage
 */

/**
 * Publish event onto topic
 * @param {EmailQueueMessage} message
 */
export async function publishEvent(message) {
  const command = new PublishCommand({
    TopicArn: snsTopicArn,
    Message: JSON.stringify(message)
  })

  const result = await client.send(command)

  logger.info(
    `Published email event for source ${message.source} reason ${message.reason}. MessageId: ${result.MessageId}`
  )

  return result
}
