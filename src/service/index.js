import { handleFormSubmissionEvents } from '~/src/service/events.js'
import { sendNotifyEmail } from '~/src/service/notify.js'

/**
 * @param {Message[]} messages
 * @returns {Promise<{saved: FormAdapterSubmissionMessage[]; failed: any[]}>}
 */
export async function handleEvent(messages) {
  const service = {
    handleFormSubmission: sendNotifyEmail
  }
  return handleFormSubmissionEvents(messages, service)
}

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
