import { Scopes } from '@defra/forms-model'
import Joi from 'joi'

import { logger } from '~/src/helpers/logging/logger.js'
import {
  deleteDlqMessage,
  getDlqMessage,
  receiveDlqMessages,
  redriveDlqMessages,
  resubmitDlqMessage
} from '~/src/messaging/event.js'

const OK_RESPONSE = 200
const NOT_FOUND = 404

export const dlqSchema = Joi.string().valid('submissions', 'emails')

const queueAndMessageIdSchema = Joi.object({
  dlq: dlqSchema.required(),
  messageId: Joi.string().required()
})

const timeoutQuerySchema = Joi.object({
  visibilityTimeout: Joi.number().optional(),
  waitTimeSeconds: Joi.number().optional()
})

export default [
  /**
   * @satisfies {ServerRoute< { Params: { dlq: string }, Query: { visibilityTimeout?: number, waitTimeSeconds?: number } } >}
   */
  ({
    method: 'GET',
    path: '/admin/deadletter/{dlq}/view',
    async handler(request, h) {
      const { params, query } = request
      const { visibilityTimeout, waitTimeSeconds } = query
      const messages = await receiveDlqMessages(
        params.dlq,
        visibilityTimeout,
        waitTimeSeconds
      )
      return h.response({ messages: messages.Messages ?? [] }).code(OK_RESPONSE)
    },
    options: {
      auth: {
        scope: [`+${Scopes.DeadLetterQueues}`]
      },
      validate: {
        params: Joi.object()
          .keys({
            dlq: dlqSchema.required()
          })
          .label('deadLetterQueueParams'),
        query: timeoutQuerySchema
      }
    }
  }),

  /**
   * @satisfies {ServerRoute< { Params: { dlq: string, messageId: string }, Query: { visibilityTimeout?: number, waitTimeSeconds?: number } } >}
   */
  ({
    method: 'GET',
    path: '/admin/deadletter/{dlq}/view/{messageId}',
    async handler(request, h) {
      const { params, query } = request
      const { visibilityTimeout, waitTimeSeconds } = query
      const message = await getDlqMessage(
        params.dlq,
        params.messageId,
        visibilityTimeout,
        waitTimeSeconds
      )
      return h.response({ message }).code(message ? OK_RESPONSE : NOT_FOUND)
    },
    options: {
      auth: {
        scope: [`+${Scopes.DeadLetterQueues}`]
      },
      validate: {
        params: queueAndMessageIdSchema,
        query: timeoutQuerySchema
      }
    }
  }),

  /**
   * @satisfies {ServerRoute< { Params: { dlq: string } } >}
   */
  ({
    method: 'POST',
    path: '/admin/deadletter/{dlq}/redrive',
    async handler(request, h) {
      const { params } = request
      const { dlq } = params
      logger.info('Redriving DLQ')
      await redriveDlqMessages(dlq)
      logger.info(`Redrive DLQ ${dlq} triggered successfully`)
      return h.response({ message: 'success' }).code(OK_RESPONSE)
    },
    options: {
      auth: {
        scope: [`+${Scopes.DeadLetterQueues}`]
      },
      validate: {
        params: Joi.object()
          .keys({
            dlq: dlqSchema.required()
          })
          .label('deadLetterQueueParams')
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: { dlq: string, messageId: string }, Payload: { messageJson: string } }>}
   */
  ({
    method: 'POST',
    path: '/admin/deadletter/{dlq}/resubmit/{messageId}',
    async handler(request, h) {
      const { params, payload } = request
      const { dlq, messageId } = params
      const { messageJson } = payload
      logger.info(`Resubmitting DLQ message ${messageId} on dlq ${dlq}`)
      await resubmitDlqMessage(dlq, messageId, JSON.stringify(messageJson))
      logger.info(`Resubmitted  DLQ message ${messageId} on dlq ${dlq}`)
      return h.response({ message: 'success' }).code(OK_RESPONSE)
    },
    options: {
      auth: {
        scope: [`+${Scopes.DeadLetterQueues}`]
      },
      validate: {
        params: queueAndMessageIdSchema
      }
    }
  }),

  /**
   * @satisfies {ServerRoute<{ Params: { dlq: string, messageId: string } }>}
   */
  ({
    method: 'DELETE',
    path: '/admin/deadletter/{dlq}/{messageId}',
    async handler(request, h) {
      const { params, query } = request
      const { dlq, messageId } = params
      const { visibilityTimeout, waitTimeSeconds } =
        /** @type {{ visibilityTimeout?: number, waitTimeSeconds?: number }} */ (
          query
        )
      logger.info(`Deleting DLQ message ${messageId} on dlq ${dlq}`)
      await deleteDlqMessage(dlq, messageId, visibilityTimeout, waitTimeSeconds)
      logger.info(`Deleted DLQ message ${messageId} on dlq ${dlq}`)
      return h.response({ message: 'success' }).code(OK_RESPONSE)
    },
    options: {
      auth: {
        scope: [`+${Scopes.DeadLetterQueues}`]
      },
      validate: {
        params: queueAndMessageIdSchema,
        query: timeoutQuerySchema
      }
    }
  })
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
