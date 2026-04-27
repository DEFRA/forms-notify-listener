import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  StartMessageMoveTaskCommand
} from '@aws-sdk/client-sqs'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { sqsClient } from '~/src/messaging/sqs.js'

export const receiveMessageTimeout = config.get('receiveMessageTimeout')
const queueUrl = config.get('sqsEventsQueueUrl')
const deadLetterQueueUrl = `${queueUrl}-deadletter`
const deadLetterQueueArn = config.get('sqsEventsDlqArn')
const maxNumberOfMessages = config.get('maxNumberOfMessages')
const visibilityTimeout = config.get('visibilityTimeout')

const MAX_RETRIES = 7
const RETRY_WAIT_BETWEEN_TRIES_IN_SECS = 1
const DEFAULT_VISIBILITY_TIMEOUT = 3
const DEFAULT_WAIT_TIME_IN_SECS = 3

const logger = createLogger()

/**
 * @type {ReceiveMessageCommandInput}
 */
const input = {
  QueueUrl: queueUrl,
  MaxNumberOfMessages: maxNumberOfMessages,
  VisibilityTimeout: visibilityTimeout
}

/**
 * Receive event messages
 * @returns {Promise<ReceiveMessageResult>}
 */
export function receiveEventMessages() {
  const command = new ReceiveMessageCommand(input)
  return sqsClient.send(command)
}

/**
 * Receive dead-letter queue messages
 * @returns {Promise<ReceiveMessageResult>}
 */
export function receiveDlqMessages(
  visibilityTimeout = DEFAULT_VISIBILITY_TIMEOUT,
  waitTimeSeconds = DEFAULT_WAIT_TIME_IN_SECS
) {
  const command = new ReceiveMessageCommand({
    QueueUrl: deadLetterQueueUrl,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: visibilityTimeout,
    WaitTimeSeconds: waitTimeSeconds
  })
  return sqsClient.send(command)
}

/**
 * Redrive the specified message from the dead-letter queue to the main queue
 * @returns {Promise<StartMessageMoveTaskResult>}
 */
export function redriveDlqMessages() {
  const command = new StartMessageMoveTaskCommand({
    SourceArn: deadLetterQueueArn
  })
  return sqsClient.send(command)
}

/**
 * Submit the specified message to the main queue, and delete the messageId from the dead-letter queue
 * @param {string} messageId
 * @param {string} messageJson
 */
export async function resubmitDlqMessage(messageId, messageJson) {
  try {
    logger.info(
      `[DLQ] Submitting new message in place of message id ${messageId}`
    )

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageJson
    })
    const sendResult = await sqsClient.send(command)
    logger.info(
      `[DLQ] Submitting new message in place of message id ${messageId}. New message id is ${sendResult.MessageId}`
    )
  } catch (err) {
    logger.error(
      err,
      `[DLQ] Failed to submit new message to main queue based on old message of id ${messageId} from DLQ`
    )
    throw err
  }
}

/**
 * Delete DLQ message by messageId
 * This has to be done as a combined 'read then delete' (while using a visibility timeout of non-zero)
 * otherwise the receipt handles become stale and the delete operation doesn't work.
 * @param {string} messageId
 * @param {number} [visibilityTimeout] - Queue visibilityTimeout
 * @param {number} [waitTimeSeconds] - Queue waitTimeSeconds
 */
export async function deleteDlqMessage(
  messageId,
  visibilityTimeout = DEFAULT_VISIBILITY_TIMEOUT,
  waitTimeSeconds = DEFAULT_WAIT_TIME_IN_SECS
) {
  let attempts = 0
  let foundMessage = null

  while (attempts < MAX_RETRIES) {
    attempts++

    const messageResponse = await receiveDlqMessages(
      visibilityTimeout,
      waitTimeSeconds
    )
    const messages = messageResponse.Messages ?? []
    for (const mess of messages) {
      logger.info(
        `[DLQ] [Delete] Received message with id ${mess.MessageId} on attempt ${attempts}`
      )
    }

    const messagesFound = messages.filter((m) => m.MessageId === messageId)

    if (messagesFound.length > 0) {
      foundMessage = messagesFound[0]
      logger.info(
        `[DLQ] Found message with id ${messageId} on attempt ${attempts}`
      )
      break
    }

    if (attempts < MAX_RETRIES) {
      logger.info(
        `[DLQ] Message ${messageId} not found in batch ${attempts}, retrying...`
      )
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_WAIT_BETWEEN_TRIES_IN_SECS * 1000)
      )
    }
  }

  if (!foundMessage) {
    const errorText = `Message with id ${messageId} not found in notify-listener DLQ after ${MAX_RETRIES} attempts`
    logger.info(errorText)
    throw new Error(errorText)
  }

  const deleteCommand = new DeleteMessageCommand({
    QueueUrl: deadLetterQueueUrl,
    ReceiptHandle: foundMessage.ReceiptHandle
  })
  logger.info(`[DLQ] Deleting message with id ${messageId}`)
  await sqsClient.send(deleteCommand)
  logger.info(`[DLQ] Deleted message with id ${messageId}`)
}

/**
 * Delete event message
 * @param {Message} message
 * @returns {Promise<DeleteMessageCommandOutput>}
 */
export function deleteEventMessage(message) {
  const command = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: message.ReceiptHandle
  })

  return sqsClient.send(command)
}

/**
 * @import { ReceiveMessageCommandInput, ReceiveMessageResult, DeleteMessageCommandOutput, Message, StartMessageMoveTaskResult } from '@aws-sdk/client-sqs'
 */
