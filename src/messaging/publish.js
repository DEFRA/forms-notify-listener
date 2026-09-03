import { SendMessageCommand } from '@aws-sdk/client-sqs'

import { logger } from '~/src/helpers/logging/logger.js'
import { getSQSClient } from '~/src/messaging/sqs.js'

const sqsClient = getSQSClient()

/**
 * @typedef {{
 *  source: string
 *  reason: string
 *  formId?: string
 *  referenceNumber?: string
 *  templateId: string
 *  emailAddress: string
 *  personalisation: { subject: string; body: string }
 *  notifyReplyToId?: string
 * }} EmailQueueMessage
 */

/**
 * Put a message directly on the specified queue (not via SNS)
 * @param {EmailQueueMessage} message
 * @param {string} queueUrl
 */
export async function putMessageOnQueue(message, queueUrl) {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message)
  })

  const result = await sqsClient.send(command)

  logger.info(
    `Put email event on queue for source ${message.source} reason ${message.reason}. MessageId: ${result.MessageId}`
  )

  return result
}
