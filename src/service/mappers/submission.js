import { formAdapterSubmissionMessagePayloadSchema } from '@defra/forms-engine-plugin/engine/types/schema.js'
import Joi from 'joi'

/**
 * @param {Message} message
 * @returns {FormAdapterSubmissionMessagePayload}
 */
export function mapSubmissionEvent(message) {
  if (!message.MessageId) {
    throw new Error('Unexpected missing Message.MessageId')
  }

  if (!message.Body) {
    throw new Error('Unexpected empty Message.Body')
  }

  /**
   * @type {FormAdapterSubmissionMessagePayload}
   */
  const messageBody = JSON.parse(message.Body)

  const value = Joi.attempt(
    messageBody,
    formAdapterSubmissionMessagePayloadSchema,
    {
      abortEarly: false,
      stripUnknown: true
    }
  )

  return {
    messageId: message.MessageId,
    ...value,
    recordCreatedAt: new Date()
  }
}

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 * @import { FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
