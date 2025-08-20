/**
 * @param {Message[]} _messages
 * @returns {Promise<{failed: Error[], saved: Message[]}>}
 */
export async function handleEvent(_messages) {
  return Promise.resolve({
    failed: [],
    saved: []
  })
}

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 */
