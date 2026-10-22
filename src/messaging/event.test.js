import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
  StartMessageMoveTaskCommand
} from '@aws-sdk/client-sqs'
import { mockClient } from 'aws-sdk-client-mock'

import 'aws-sdk-client-mock-jest'
import {
  deleteDlqMessage,
  deleteEventMessage,
  getDeadLetterQueueUrl,
  getDlqMessageCount,
  receiveAllDlqMessages,
  receiveDlqMessages,
  receiveEventMessages,
  redriveDlqMessages,
  resubmitDlqMessage
} from '~/src/messaging/event.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}))

const queueUrl = 'http://queue-url'

describe('event', () => {
  const snsMock = mockClient(SQSClient)
  const messageId = '31cb6fff-8317-412e-8488-308d099034c4'
  const receiptHandle = 'YzAwNzQ3MGMtZGY5Mi0'
  const messageStub = {
    Body: 'hello world',
    MD5OfBody: '9e5729d418a527676ab6807b35c6ffb1',
    MessageId: messageId,
    ReceiptHandle: receiptHandle
  }
  afterEach(() => {
    snsMock.reset()
  })
  describe('receiveEventMessages', () => {
    it('should send messages', async () => {
      const receivedMessage = {
        Messages: [messageStub]
      }
      snsMock.on(ReceiveMessageCommand).resolves(receivedMessage)
      await expect(receiveEventMessages(queueUrl)).resolves.toEqual(
        receivedMessage
      )
    })
  })

  describe('deleteEventMessage', () => {
    it('should delete event message', async () => {
      /**
       * @type {DeleteMessageCommandOutput}
       */
      const deleteResult = {
        $metadata: {}
      }

      snsMock.on(DeleteMessageCommand).resolves(deleteResult)
      await deleteEventMessage(queueUrl, messageStub)
      expect(snsMock).toHaveReceivedCommandWith(DeleteMessageCommand, {
        QueueUrl: expect.any(String),
        ReceiptHandle: receiptHandle
      })
    })
  })

  describe('receiveDlqMessages', () => {
    it('should receive dead-letter queue messages', async () => {
      const receivedMessage = {
        Messages: [messageStub]
      }

      snsMock.on(ReceiveMessageCommand).resolves(receivedMessage)
      await receiveDlqMessages('emails')
      expect(snsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, {
        QueueUrl: expect.any(String),
        VisibilityTimeout: 3,
        WaitTimeSeconds: 3
      })
    })
  })

  describe('getDlqMessageCount', () => {
    it('should sum visible and in-flight messages', async () => {
      snsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: {
          ApproximateNumberOfMessages: '4',
          ApproximateNumberOfMessagesNotVisible: '3'
        }
      })
      await expect(getDlqMessageCount('emails')).resolves.toBe(7)
      expect(snsMock).toHaveReceivedCommandWith(GetQueueAttributesCommand, {
        QueueUrl: expect.any(String),
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible'
        ]
      })
    })

    it('should default missing attributes to zero', async () => {
      snsMock.on(GetQueueAttributesCommand).resolves({})
      await expect(getDlqMessageCount('submissions')).resolves.toBe(0)
    })
  })

  describe('receiveAllDlqMessages', () => {
    const message1 = { ...messageStub, MessageId: 'message-1' }
    const message2 = { ...messageStub, MessageId: 'message-2' }

    /**
     * @param {number} count
     */
    function mockCount(count) {
      snsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: {
          ApproximateNumberOfMessages: String(count),
          ApproximateNumberOfMessagesNotVisible: '0'
        }
      })
    }

    it('should keep receiving until every counted message is collected', async () => {
      mockCount(2)
      snsMock
        .on(ReceiveMessageCommand)
        .resolvesOnce({ Messages: [message1] })
        .resolvesOnce({ Messages: [message2] })

      await expect(receiveAllDlqMessages('emails')).resolves.toEqual([
        message1,
        message2
      ])
      expect(snsMock).toHaveReceivedCommandTimes(ReceiveMessageCommand, 2)
      expect(snsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, {
        QueueUrl: expect.any(String),
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 3,
        WaitTimeSeconds: 3
      })
    })

    it('should not receive at all when the queue is empty', async () => {
      mockCount(0)

      await expect(receiveAllDlqMessages('emails')).resolves.toEqual([])
      expect(snsMock).toHaveReceivedCommandTimes(ReceiveMessageCommand, 0)
    })

    it('should stop when a receive returns nothing', async () => {
      mockCount(3)
      snsMock
        .on(ReceiveMessageCommand)
        .resolvesOnce({ Messages: [message1] })
        .resolvesOnce({})

      await expect(receiveAllDlqMessages('emails')).resolves.toEqual([message1])
      expect(snsMock).toHaveReceivedCommandTimes(ReceiveMessageCommand, 2)
    })

    it('should de-duplicate messages received more than once', async () => {
      mockCount(2)
      snsMock
        .on(ReceiveMessageCommand)
        .resolvesOnce({ Messages: [message1] })
        .resolvesOnce({ Messages: [message1] })
        .resolvesOnce({ Messages: [message2] })

      await expect(receiveAllDlqMessages('emails')).resolves.toEqual([
        message1,
        message2
      ])
    })

    it('should give up after the maximum number of receives', async () => {
      mockCount(50)
      snsMock.on(ReceiveMessageCommand).resolves({ Messages: [message1] })

      await expect(receiveAllDlqMessages('emails')).resolves.toEqual([message1])
      expect(snsMock).toHaveReceivedCommandTimes(ReceiveMessageCommand, 10)
    })

    it('should pass through visibility timeout and wait time', async () => {
      mockCount(1)
      snsMock.on(ReceiveMessageCommand).resolves({ Messages: [message1] })

      await receiveAllDlqMessages('submissions', 5, 1)
      expect(snsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, {
        VisibilityTimeout: 5,
        WaitTimeSeconds: 1
      })
    })
  })

  describe('redriveDlqMessages', () => {
    it('should redrive dead-letter queue messages', async () => {
      /**
       * @type {StartMessageMoveTaskCommandOutput}
       */
      const redriveResult = {
        TaskHandle: '123',
        $metadata: {}
      }

      snsMock.on(StartMessageMoveTaskCommand).resolves(redriveResult)
      await redriveDlqMessages('emails')
      expect(snsMock).toHaveReceivedCommandWith(StartMessageMoveTaskCommand, {
        SourceArn: expect.any(String)
      })
    })
  })

  describe('deleteDlqMessage', () => {
    it('should delete event message', async () => {
      const receivedMessage = {
        Messages: [messageStub, messageStub, messageStub]
      }

      snsMock.on(ReceiveMessageCommand).resolves(receivedMessage)
      await deleteDlqMessage('submissions', messageStub.MessageId, 5, 2)
      expect(snsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, {
        QueueUrl: expect.any(String),
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 5,
        WaitTimeSeconds: 2
      })
      expect(snsMock).toHaveReceivedCommandWith(DeleteMessageCommand, {
        QueueUrl: expect.any(String),
        ReceiptHandle: receiptHandle
      })
    })

    it('should delete event message with default values', async () => {
      const receivedMessage = {
        Messages: [messageStub, messageStub, messageStub]
      }

      snsMock.on(ReceiveMessageCommand).resolves(receivedMessage)
      await deleteDlqMessage('emails', messageStub.MessageId)
      expect(snsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, {
        QueueUrl: expect.any(String),
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 3,
        WaitTimeSeconds: 3
      })
      expect(snsMock).toHaveReceivedCommandWith(DeleteMessageCommand, {
        QueueUrl: expect.any(String),
        ReceiptHandle: receiptHandle
      })
    })

    it('should throw if message not found after max attempts', async () => {
      const receivedMessage = {
        Messages: []
      }

      snsMock.on(ReceiveMessageCommand).resolves(receivedMessage)
      await expect(() =>
        deleteDlqMessage('emails', messageStub.MessageId, 0, 0)
      ).rejects.toThrow(
        'Message with id 31cb6fff-8317-412e-8488-308d099034c4 not found in emails DLQ after 7 attempts'
      )
    }, 10000)
  })

  describe('resubmitDlqMessage', () => {
    it('should resubmit message to main queue', async () => {
      const sendMessage = {
        MessageId: '12345'
      }

      snsMock.on(SendMessageCommand).resolves(sendMessage)
      await resubmitDlqMessage(
        'emails',
        messageStub.MessageId,
        messageStub.Body
      )
      expect(snsMock).toHaveReceivedCommandWith(SendMessageCommand, {
        QueueUrl:
          'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/forms_notify_email_events',
        MessageBody: messageStub.Body
      })
    })

    it('should throw if resubmit fails', async () => {
      snsMock.on(SendMessageCommand).rejects('bad SQS command')
      await expect(() =>
        resubmitDlqMessage('emails', messageStub.MessageId, messageStub.Body)
      ).rejects.toThrow('bad SQS command')
    })
  })

  describe('getDeadLetterQueueUrl', () => {
    it('should get correct queue', () => {
      expect(getDeadLetterQueueUrl('emails')).toBe(
        'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/forms_notify_email_events-deadletter'
      )
      expect(getDeadLetterQueueUrl('submissions')).toBe(
        'http://sqs.eu-west-2.127.0.0.1:4566/000000000000/forms_notify_listener_events-deadletter'
      )
    })
  })
})

/**
 * @import { DeleteMessageCommandOutput, StartMessageMoveTaskCommandOutput } from '@aws-sdk/client-sqs'
 */
