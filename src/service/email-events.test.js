import { ValidationError } from 'joi'

import { sendNotification } from '~/src/lib/notify.js'
import { deleteEventMessage } from '~/src/messaging/event.js'
import { buildMessageStub } from '~/src/service/__stubs__/event-builders.js'
import { handleEmailEvents, mapEmailEvent } from '~/src/service/email-events.js'

jest.mock('~/src/lib/notify.js')
jest.mock('~/src/messaging/event.js')
jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}))
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn(() => {
      return 'mock-value'
    })
  }
}))

describe('email events', () => {
  const emailMessageContent = {
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
  /**
   *
   * @type {Message}
   */
  const emailMessage = buildMessageStub(emailMessageContent)

  describe('mapEmailEvent', () => {
    it('should map the message', () => {
      expect(mapEmailEvent(emailMessage)).toEqual({
        source: 'notify-listener',
        reason: 'confirmation-email',
        templateId: 'email-template-id',
        emailAddress: 'target.email@test.com',
        personalisation: { subject: 'Test email subject', body: 'body text' },
        notifyReplyToId: 'reply-to-id',
        recordCreatedAt: expect.any(Date),
        messageId: 'fbafb17e-86f0-4ac6-b864-3f32cd60b228'
      })
    })

    it('should allow unknown fields the message', () => {
      const event = mapEmailEvent({
        ...emailMessage,
        // @ts-expect-error - unknown field
        unknownField: 'visible'
      })
      // @ts-expect-error - unknown field
      expect(event.unknownField).toBeUndefined()
    })

    it('should fail if there is no MessageId', () => {
      const { MessageId, ...emailMessageWithoutMessageId } = emailMessage

      expect(() => mapEmailEvent(emailMessageWithoutMessageId)).toThrow(
        new Error('Unexpected missing Message.MessageId')
      )
    })

    it('should fail if there is no Body', () => {
      const { Body, ...emailMessageWithoutMessageId } = emailMessage

      expect(() => mapEmailEvent(emailMessageWithoutMessageId)).toThrow(
        new Error('Unexpected empty Message.Body')
      )
    })

    it('should fail if the message is invalid', () => {
      const badEmailMessageContent = structuredClone(emailMessageContent)
      badEmailMessageContent.source = ''
      /**
       *
       * @type {Message}
       */
      const badEmailMessage = buildMessageStub(badEmailMessageContent)

      expect(() => mapEmailEvent(badEmailMessage)).toThrow(
        new ValidationError(
          '"source" must be one of [notify-listener, submission-api]. "source" is not allowed to be empty',
          [],
          badEmailMessage
        )
      )
    })
  })

  describe('handleEmailEvents', () => {
    const messageId1 = '01267dd5-8cc7-4749-9802-40190f6429eb'
    const messageId2 = '5dd16f40-6118-4797-97c9-60a298c9a898'
    const messageId3 = '70c0155c-e9a9-4b90-a45f-a839924fca65'

    const emailMessagePayload = {
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

    const message1 = buildMessageStub(emailMessagePayload, {
      MessageId: messageId1
    })
    const message2 = buildMessageStub(emailMessagePayload, {
      MessageId: messageId2
    })
    const message3 = buildMessageStub(emailMessagePayload, {
      MessageId: messageId3
    })
    const messages = [message1, message2, message3]

    it('should handle a list of email events', async () => {
      const expectedMapped1 = {
        ...emailMessagePayload,
        recordCreatedAt: expect.any(Date),
        messageId: messageId1
      }
      const expectedMapped2 = {
        ...emailMessagePayload,
        recordCreatedAt: expect.any(Date),
        messageId: messageId2
      }
      const expectedMapped3 = {
        ...emailMessagePayload,
        recordCreatedAt: expect.any(Date),
        messageId: messageId3
      }
      const result = await handleEmailEvents(messages)
      expect(sendNotification).toHaveBeenCalledTimes(3)
      expect(sendNotification).toHaveBeenNthCalledWith(1, expectedMapped1)
      expect(sendNotification).toHaveBeenNthCalledWith(2, expectedMapped2)
      expect(sendNotification).toHaveBeenNthCalledWith(3, expectedMapped3)
      expect(deleteEventMessage).toHaveBeenCalledTimes(3)
      expect(deleteEventMessage).toHaveBeenNthCalledWith(
        1,
        'mock-value',
        message1
      )
      expect(deleteEventMessage).toHaveBeenNthCalledWith(
        2,
        'mock-value',
        message2
      )
      expect(deleteEventMessage).toHaveBeenNthCalledWith(
        3,
        'mock-value',
        message3
      )

      expect(result).toEqual({
        saved: [expectedMapped1, expectedMapped2, expectedMapped3],
        failed: []
      })
    })

    it('should handle errors softly', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: undefined })
      jest
        .mocked(sendNotification)
        .mockRejectedValueOnce(new Error('Upstream error'))
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: undefined })

      const emptyMessage = {}
      const result = await handleEmailEvents([...messages, emptyMessage])
      expect(result.saved).toHaveLength(2)
      expect(result.failed).toHaveLength(2)
    })
  })
})

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 */
