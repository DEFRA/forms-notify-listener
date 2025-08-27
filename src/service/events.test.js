import { ValidationError } from 'joi'

import { deleteEventMessage } from '~/src/messaging/event.js'
import {
  buildFormAdapterSubmissionMessageData,
  buildFormAdapterSubmissionMessageMetaSerialised,
  buildFormAdapterSubmissionMessageMetaStub,
  buildFormAdapterSubmissionMessagePayloadStub,
  buildMessageStub
} from '~/src/service/__stubs__/event-builders.js'
import {
  handleFormSubmissionEvents,
  mapFormAdapterSubmissionEvent
} from '~/src/service/events.js'

jest.mock('~/src/messaging/event.js')
jest.mock('~/src/helpers/logging/logger.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'roleEditorGroupId') return 'editor-group-id'
      return 'mock-value'
    })
  }
}))

describe('events', () => {
  /**
   * @type {FormSubmissionService}
   */
  const formSubmissionService = {
    handleFormSubmission: jest.fn()
  }

  const formSubmissionMetaBase = {
    schemaVersion: 1,
    referenceNumber: '576-225-943',
    formName: 'Order a pizza',
    formId: '68a8b0449ab460290c28940a',
    formSlug: 'order-a-pizza',
    status: 'live',
    isPreview: false,
    notificationEmail: 'info@example.com'
  }
  const formAdapterSubmission = {
    meta: buildFormAdapterSubmissionMessageMetaSerialised({
      ...formSubmissionMetaBase,
      timestamp: '2025-08-22T18:15:10.785Z'
    }),
    data: buildFormAdapterSubmissionMessageData({
      main: {
        QMwMir: 'Roman Pizza',
        duOEvZ: 'Small',
        DzEODf: ['Mozzarella'],
        juiCfC: ['Pepperoni', 'Sausage', 'Onions', 'Basil'],
        YEpypP: 'None',
        JumNVc: 'Joe Bloggs',
        ALNehP: '+441234567890',
        vAqTmg: {
          addressLine1: '1 Anywhere Street',
          town: 'Anywhereville',
          postcode: 'AN1 2WH'
        },
        IbXVGY: {
          day: 22,
          month: 8,
          year: 2025
        },
        HGBWLt: ['Garlic sauce']
      },
      repeaters: {},
      files: {}
    })
  }
  /**
   *
   * @type {Message}
   */
  const auditEventMessage = buildMessageStub(formAdapterSubmission)

  describe('mapFormAdapterSubmissionEvent', () => {
    it('should map the message', () => {
      const expectedEvent = buildFormAdapterSubmissionMessagePayloadStub({
        data: formAdapterSubmission.data,
        meta: {
          ...formSubmissionMetaBase,
          timestamp: new Date('2025-08-22T18:15:10.785Z')
        }
      })
      expect(mapFormAdapterSubmissionEvent(auditEventMessage)).toEqual({
        ...expectedEvent,
        recordCreatedAt: expect.any(Date),
        messageId: 'fbafb17e-86f0-4ac6-b864-3f32cd60b228'
      })
    })

    it('should allow unknown fields the message', () => {
      const event = mapFormAdapterSubmissionEvent({
        ...auditEventMessage,
        // @ts-expect-error - unknown field
        unknownField: 'visible'
      })
      // @ts-expect-error - unknown field
      expect(event.unknownField).toBeUndefined()
    })

    it('should fail if there is no MessageId', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { MessageId, ...auditEventMessageWithoutMessageId } =
        auditEventMessage

      expect(() =>
        mapFormAdapterSubmissionEvent(auditEventMessageWithoutMessageId)
      ).toThrow(new Error('Unexpected missing Message.MessageId'))
    })

    it('should fail if there is no Body', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Body, ...auditEventMessageWithoutBody } = auditEventMessage

      expect(() =>
        mapFormAdapterSubmissionEvent(auditEventMessageWithoutBody)
      ).toThrow(new Error('Unexpected empty Message.Body'))
    })

    it('should fail if the message is invalid', () => {
      const auditEventMessage = buildMessageStub({
        meta: buildFormAdapterSubmissionMessageMetaSerialised({
          formId: undefined
        }),
        data: buildFormAdapterSubmissionMessageData()
      })

      expect(() => mapFormAdapterSubmissionEvent(auditEventMessage)).toThrow(
        new ValidationError('"meta.formId" is required', [], auditEventMessage)
      )
    })
  })

  describe('handleFormSubmissionEvents', () => {
    const messageId1 = '01267dd5-8cc7-4749-9802-40190f6429eb'
    const messageId2 = '5dd16f40-6118-4797-97c9-60a298c9a898'
    const messageId3 = '70c0155c-e9a9-4b90-a45f-a839924fca65'

    const payload1 = {
      ...formAdapterSubmission,
      meta: buildFormAdapterSubmissionMessageMetaStub({
        ...formAdapterSubmission.meta,
        timestamp: new Date(formAdapterSubmission.meta.timestamp)
      })
    }
    const payload2 = buildFormAdapterSubmissionMessagePayloadStub()
    const payload3 = buildFormAdapterSubmissionMessagePayloadStub()

    const message1 = buildMessageStub(
      buildFormAdapterSubmissionMessagePayloadStub(payload1),
      { MessageId: messageId1 }
    )
    const message2 = buildMessageStub(payload2, { MessageId: messageId2 })
    const message3 = buildMessageStub(payload3, { MessageId: messageId3 })
    const messages = [message1, message2, message3]

    it('should handle a list of audit events', async () => {
      const expectedMapped1 = {
        ...payload1,
        recordCreatedAt: expect.any(Date),
        messageId: messageId1
      }
      const expectedMapped2 = {
        ...payload2,
        recordCreatedAt: expect.any(Date),
        messageId: messageId2
      }
      const expectedMapped3 = {
        ...payload3,
        recordCreatedAt: expect.any(Date),
        messageId: messageId3
      }
      formSubmissionService.handleFormSubmission.mockResolvedValueOnce()
      formSubmissionService.handleFormSubmission.mockResolvedValueOnce()
      formSubmissionService.handleFormSubmission.mockResolvedValueOnce()
      const expectedResults = [
        expectedMapped1,
        expectedMapped2,
        expectedMapped3
      ]
      const result = await handleFormSubmissionEvents(
        messages,
        formSubmissionService
      )
      expect(formSubmissionService.handleFormSubmission).toHaveBeenCalledTimes(
        3
      )
      expect(
        formSubmissionService.handleFormSubmission
      ).toHaveBeenNthCalledWith(1, expectedMapped1)
      expect(
        formSubmissionService.handleFormSubmission
      ).toHaveBeenNthCalledWith(2, expectedMapped2)
      expect(
        formSubmissionService.handleFormSubmission
      ).toHaveBeenNthCalledWith(3, expectedMapped3)
      expect(deleteEventMessage).toHaveBeenCalledTimes(3)
      expect(deleteEventMessage).toHaveBeenNthCalledWith(1, message1)
      expect(deleteEventMessage).toHaveBeenNthCalledWith(2, message2)
      expect(deleteEventMessage).toHaveBeenNthCalledWith(3, message3)

      expect(result).toEqual({
        saved: expectedResults,
        failed: []
      })
    })

    it('should handle errors softly', async () => {
      formSubmissionService.handleFormSubmission.mockResolvedValueOnce()
      formSubmissionService.handleFormSubmission.mockRejectedValueOnce(
        new Error('Upstream error')
      )
      formSubmissionService.handleFormSubmission.mockResolvedValueOnce()

      const emptyMessage = {}
      const result = await handleFormSubmissionEvents(
        [...messages, emptyMessage],
        formSubmissionService
      )
      expect(result.saved).toHaveLength(2)
      expect(result.failed).toHaveLength(2)
    })
  })
})

/**
 * @import { Message } from '@aws-sdk/client-sqs'
 * @import { FormAdapterSubmissionMessagePayload, FormSubmissionService } from '@defra/forms-engine-plugin/types'
 */
