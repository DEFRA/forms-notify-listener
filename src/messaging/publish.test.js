import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { createLogContext, runWithLogContext } from '@defra/forms-common'
import { mockClient } from 'aws-sdk-client-mock'

import 'aws-sdk-client-mock-jest'
import { putMessageOnQueue } from '~/src/messaging/publish.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn()
  }
}))

describe('publish', () => {
  const sqsMock = mockClient(SQSClient)

  afterEach(() => {
    sqsMock.reset()
  })

  describe('putMessageOnQueue', () => {
    const message = {
      source: 'notify-listener',
      reason: 'confirmation-email',
      templateId: 'email-template-id',
      emailAddress: 'target.email@test.com',
      personalisation: {
        subject: 'Test email subject',
        body: 'body text'
      },
      notifyReplyToId: 'reply-to-id'
    }

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should publish', async () => {
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await putMessageOnQueue(message, 'http://queue-url')
      expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
        QueueUrl: 'http://queue-url',
        MessageBody: JSON.stringify(message)
      })
    })

    it('should send the log context with the message', async () => {
      const context = createLogContext({ correlationId: 'correlation-id' })

      sqsMock.on(SendMessageCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await runWithLogContext(context, () =>
        putMessageOnQueue(message, 'http://queue-url')
      )
      expect(sqsMock).toHaveReceivedCommandWith(SendMessageCommand, {
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          correlationId: { DataType: 'String', StringValue: 'correlation-id' }
        }
      })
    })
  })
})
