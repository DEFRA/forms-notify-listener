import { getErrorMessage } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/helpers/logging/logger.js'
import {
  receiveEventMessages,
  receiveMessageTimeout
} from '~/src/messaging/event.js'
import { sendNotifyEmails } from '~/src/service/notify.js'
import { handleSubmissionEvents } from '~/src/service/submission-events.js'

const queueUrl = config.get('sqsEventsQueueUrl')

/**
 * @returns {Promise<void>}
 */
export async function runTaskOnce() {
  logger.info('Receiving submission queue messages')

  const service = {
    handleFormSubmission: sendNotifyEmails
  }

  try {
    const result = await receiveEventMessages(queueUrl)
    const messages = result.Messages
    const messageCount = messages ? messages.length : 0

    logger.info(`Received ${messageCount} submission queue messages`)

    if (messages && messageCount) {
      logger.info('Handling submission events')

      await handleSubmissionEvents(messages, service)

      logger.info(`Handled submission event`)
    }
  } catch (err) {
    logger.error(
      err,
      `[runTaskOnce] Receive submission messages task failed - ${getErrorMessage(err)}`
    )
  }
}

/**
 * Task to poll for messages and store the result in the DB
 * @returns {Promise<void>}
 */
export async function runTask() {
  await runTaskOnce()

  logger.info(
    `Adding submission task to stack in ${receiveMessageTimeout} milliseconds`
  )

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(runTask, receiveMessageTimeout)

  logger.info(`Added submission task to stack`)
}
