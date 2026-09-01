import { getErrorMessage } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { logger } from '~/src/helpers/logging/logger.js'
import {
  receiveEventMessages,
  receiveMessageTimeout
} from '~/src/messaging/event.js'
import { handleEmailEvents } from '~/src/service/email-events.js'

const queueUrl = config.get('sqsEmailsQueueUrl')

/**
 * @returns {Promise<void>}
 */
export async function runTaskOnce() {
  logger.info('Receiving email queue messages')

  try {
    const result = await receiveEventMessages(queueUrl)
    const messages = result.Messages
    const messageCount = messages ? messages.length : 0

    logger.info(`Received ${messageCount} email queue messages`)

    if (messages && messageCount) {
      logger.info('Handling email events')

      await handleEmailEvents(messages)

      logger.info(`Handled email event`)
    }
  } catch (err) {
    logger.error(
      err,
      `[runTaskOnce] Receive email messages task failed - ${getErrorMessage(err)}`
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
    `Adding email task to stack in ${receiveMessageTimeout} milliseconds`
  )

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(runTask, receiveMessageTimeout)

  logger.info(`Added email task to stack`)
}
