import { getErrorMessage } from '@defra/forms-model'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { getErrorDetails } from '~/src/helpers/string-utils.js'
import { sendNotification } from '~/src/lib/notify.js'
import { deleteEventMessage } from '~/src/messaging/event.js'
import { Reasons, Sources } from '~/src/service/constants.js'

const queueUrl = config.get('sqsEmailsQueueUrl')

const emailQueueMessagePayloadSchema = Joi.object({
  source: Joi.string()
    .valid(Sources.NotifyListener, Sources.SubmissionApi)
    .required(),
  reason: Joi.string()
    .valid(
      Reasons.ConfirmationEmail,
      Reasons.SaveAndExit,
      Reasons.SubmissionEmail
    )
    .required(),
  templateId: Joi.string().required(),
  emailAddress: Joi.string().email().required(),
  personalisation: Joi.object().required(),
  notifyReplyToId: Joi.string().optional()
})

/**
 * @param {Message} message
 * @returns {EmailQueueMessage}
 */
export function mapEmailEvent(message) {
  if (!message.MessageId) {
    throw new Error('Unexpected missing Message.MessageId')
  }

  if (!message.Body) {
    throw new Error('Unexpected empty Message.Body')
  }

  /**
   * @type {EmailQueueMessage}
   */
  const messageBody = JSON.parse(message.Body)

  const value = Joi.attempt(messageBody, emailQueueMessagePayloadSchema, {
    abortEarly: false,
    stripUnknown: true
  })

  return {
    messageId: message.MessageId,
    ...value,
    recordCreatedAt: new Date()
  }
}

/**
 * Create form submission event
 * @param {Message[]} messages
 */
export async function handleEmailEvents(messages) {
  logger.info('Handling email events')
  /**
   * @param {Message} message
   */
  async function handleSingleEmailEvent(message) {
    try {
      const body = mapEmailEvent(message)

      await sendNotification(body)

      logger.info(`Deleting ${message.MessageId}`)

      await deleteEventMessage(queueUrl, message)

      logger.info(`Deleted ${message.MessageId}`)

      return body
    } catch (err) {
      logger.error(
        err,
        `[handleSingleEmailEvent] Failed to handle message - ${getErrorMessage(err)} ${getErrorDetails(err)}`
      )
      throw err
    }
  }

  const results = await Promise.allSettled(messages.map(handleSingleEmailEvent))

  const saved = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  const savedMessage = saved
    .map((item) => `${item.source}:${item.reason}`)
    .join(',')

  logger.info(`Handled email event: ${savedMessage}`)

  const failed = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason)

  if (failed.length) {
    const failedMessage = failed.map((item) => getErrorMessage(item)).join(',')

    logger.info(`Failed to handle email event: ${failedMessage}`)
  }

  return { saved, failed }
}

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 * @import { EmailQueueMessage } from '~/src/messaging/publish.js'
 */
