import {
  ComponentType,
  ControllerType,
  Engine,
  FormStatus,
  SchemaVersion
} from '@defra/forms-model'
import { buildDefinition, buildMetaData } from '@defra/forms-model/stubs'

import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageData,
  buildFormAdapterSubmissionMessageMetaStub,
  buildFormAdapterSubmissionMessageResult
} from '~/src/service/__stubs__/event-builders.js'
import {
  definitionForEmail,
  definitionForFeedbackForm
} from '~/src/service/__stubs__/forms.js'
import {
  sendNotifyEmails,
  sendUserConfirmationEmail
} from '~/src/service/notify.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}))
jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})
jest.mock('~/src/lib/notify.js')
jest.mock('~/src/lib/manager.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'notifyTemplateId') return 'notify-template-id-1'
      if (key === 'notifyReplyToId') return 'notify-reply-to-id-1'
      return 'mock-value'
    })
  }
}))

describe('notify', () => {
  const formId = '68a8b0449ab460290c28940a'
  const referenceNumber = '576-225-943'
  const formSubmissionData = buildFormAdapterSubmissionMessageData({
    main: {
      JHCHVE: 'Julius Ceasar'
    },
    repeaters: {},
    files: {}
  })
  const formSubmissionMeta = buildFormAdapterSubmissionMessageMetaStub({
    formName: 'Machine readable form',
    formSlug: 'machine-readable-form',
    isPreview: false,
    status: FormStatus.Live,
    notificationEmail: 'notificationEmail@example.uk',
    referenceNumber,
    formId
  })

  const formSubmissionResult = buildFormAdapterSubmissionMessageResult()

  const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
    meta: formSubmissionMeta,
    data: formSubmissionData,
    result: formSubmissionResult
  })
  const baseDefinition = buildDefinition({
    name: 'Machine readable form',
    output: {
      audience: 'machine',
      version: '2'
    },
    engine: Engine.V2,
    schema: SchemaVersion.V2,
    startPage: '/summary',
    pages: [
      {
        title: '',
        path: '/what-is-your-name',
        components: [
          {
            type: ComponentType.TextField,
            title: 'What is your name?',
            name: 'JHCHVE',
            shortDescription: 'Your name',
            hint: '',
            options: {
              required: true
            },
            schema: {},
            id: 'b2e4a0f5-eb78-4faf-a56d-cfe2462405e9'
          }
        ],
        next: [],
        id: '3b6baff0-e694-428b-9823-63799c5f730a'
      },
      {
        id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
        title: 'Summary',
        path: '/summary',
        controller: ControllerType.Summary
      }
    ],
    conditions: [],
    sections: [],
    lists: []
  })

  describe('sendNotifyEmails', () => {
    it('should send a v1 machine readable email', async () => {
      const definition = buildDefinition({
        ...baseDefinition,
        output: {
          audience: 'machine',
          version: '1'
        }
      })
      jest.mocked(getFormDefinition).mockResolvedValueOnce(definition)
      await sendNotifyEmails(formAdapterSubmissionMessage)

      const [sendNotificationCall] = jest.mocked(sendNotification).mock.calls[0]
      expect(sendNotificationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Machine readable form',
          body: expect.any(String)
        }
      })
      const sendNotificationBody = JSON.parse(
        Buffer.from(
          sendNotificationCall.personalisation.body,
          'base64'
        ).toString('utf-8')
      )
      expect(sendNotificationBody).toEqual({
        meta: {
          schemaVersion: '1',
          timestamp: expect.any(String),
          referenceNumber,
          definition
        },
        data: {
          ...formSubmissionData
        }
      })
    })

    it('should send a v2 machine readable email', async () => {
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      await sendNotifyEmails(formAdapterSubmissionMessage)

      const [sendNotificationCall] = jest.mocked(sendNotification).mock.calls[0]
      expect(sendNotificationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Machine readable form',
          body: expect.any(String)
        }
      })
      const sendNotificationBody = JSON.parse(
        Buffer.from(
          sendNotificationCall.personalisation.body,
          'base64'
        ).toString('utf-8')
      )
      expect(new Date(sendNotificationBody.meta.timestamp)).not.toBeNaN()
      expect(sendNotificationBody).toEqual({
        meta: {
          schemaVersion: '2',
          timestamp: expect.any(String),
          referenceNumber,
          definition: baseDefinition
        },
        data: formSubmissionData
      })
    })

    it('should send a submission email', async () => {
      const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Order a pizza',
          formSlug: 'order-a-pizza',
          isPreview: false,
          status: FormStatus.Live,
          notificationEmail: 'notificationEmail@example.uk',
          referenceNumber: '576-225-943',
          formId
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
        }),
        result: {
          files: {
            main: '9a2c50db-cbd5-4fba-ae5f-58dbfdd176d2',
            repeaters: {}
          }
        }
      })

      jest.mocked(getFormDefinition).mockResolvedValueOnce(definitionForEmail)
      await sendNotifyEmails(formAdapterSubmissionMessage)
      expect(getFormDefinition).toHaveBeenCalledWith(
        formId,
        FormStatus.Live,
        undefined
      )
      expect(sendNotification).toHaveBeenCalledWith({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
    })

    it('should not send emails if a feedback form', async () => {
      const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Feedback',
          formSlug: 'feedback',
          isPreview: false,
          status: FormStatus.Live,
          notificationEmail: 'notificationEmail@example.uk',
          referenceNumber: '576-225-943',
          formId
        }),
        data: buildFormAdapterSubmissionMessageData({
          main: {
            QMwMir: 'Very satisfied',
            duOEvZ: 'Extra text',
            formId
          },
          repeaters: {},
          files: {}
        }),
        result: {
          files: {
            main: '9a2c50db-cbd5-4fba-ae5f-58dbfdd176d2',
            repeaters: {}
          }
        }
      })

      jest
        .mocked(getFormDefinition)
        .mockResolvedValueOnce(definitionForFeedbackForm)
      await sendNotifyEmails(formAdapterSubmissionMessage)
      expect(sendNotification).not.toHaveBeenCalled()
    })

    it('should send multiple submission emails', async () => {
      const formAdapterSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Order a pizza',
          formSlug: 'order-a-pizza',
          isPreview: false,
          status: FormStatus.Live,
          notificationEmail: 'notificationEmail1@example.uk',
          referenceNumber: '576-225-943',
          formId
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
        }),
        result: {
          files: {
            main: '9a2c50db-cbd5-4fba-ae5f-58dbfdd176d2',
            repeaters: {}
          }
        }
      })

      const definitionForMultipleEmails = {
        ...definitionForEmail,
        outputs: /** @type {Output[]} */ ([
          {
            emailAddress: 'notificationEmail2@example.uk',
            audience: 'human',
            version: '1'
          },
          {
            emailAddress: 'notificationEmail2@example.uk',
            audience: 'machine',
            version: '1'
          },
          {
            emailAddress: 'notificationEmail3@example.uk',
            audience: 'machine',
            version: '2'
          }
        ])
      }
      jest
        .mocked(getFormDefinition)
        .mockResolvedValueOnce(definitionForMultipleEmails)
      await sendNotifyEmails(formAdapterSubmissionMessage)
      expect(getFormDefinition).toHaveBeenCalledWith(
        formId,
        FormStatus.Live,
        undefined
      )
      expect(sendNotification).toHaveBeenNthCalledWith(1, {
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail1@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
      expect(sendNotification).toHaveBeenNthCalledWith(2, {
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail2@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
      expect(sendNotification).toHaveBeenNthCalledWith(3, {
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail2@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
      expect(sendNotification).toHaveBeenNthCalledWith(4, {
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail3@example.uk',
        personalisation: {
          subject: 'Form submission: Order a pizza',
          body: expect.any(String)
        }
      })
    })

    it('should send a user confirmation email', async () => {
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      jest.mocked(getFormMetadata).mockResolvedValueOnce(
        buildMetaData({
          submissionGuidance: 'Some guidance text'
        })
      )
      const formAdapterMessageWithUserEmail = structuredClone(
        formAdapterSubmissionMessage
      )
      formAdapterMessageWithUserEmail.meta.custom = {
        userConfirmationEmail: 'my-email@test.com'
      }
      await sendNotifyEmails(formAdapterMessageWithUserEmail)

      expect(jest.mocked(sendNotification)).toHaveBeenCalledTimes(2)
      const [sendNotificationCall] = jest.mocked(sendNotification).mock.calls[0]
      expect(sendNotificationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'notificationEmail@example.uk',
        personalisation: {
          subject: 'Form submission: Machine readable form',
          body: expect.any(String)
        }
      })
      const [sendConfirmationCall] = jest.mocked(sendNotification).mock.calls[1]
      expect(sendConfirmationCall).toEqual({
        templateId: 'notify-template-id-1',
        emailAddress: 'my-email@test.com',
        personalisation: {
          subject: 'Form submitted to Defra',
          body: expect.any(String)
        },
        notifyReplyToId: 'notify-reply-to-id-1'
      })
      const sendNotificationBody = JSON.parse(
        Buffer.from(
          sendNotificationCall.personalisation.body,
          'base64'
        ).toString('utf-8')
      )
      expect(new Date(sendNotificationBody.meta.timestamp)).not.toBeNaN()
      expect(sendNotificationBody).toEqual({
        meta: {
          schemaVersion: '2',
          timestamp: expect.any(String),
          referenceNumber,
          definition: baseDefinition
        },
        data: formSubmissionData
      })
    })

    it('confirmation email should handle and throw errors', async () => {
      const err = new Error('Upstream failure')
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      jest.mocked(getFormMetadata).mockResolvedValueOnce(
        buildMetaData({
          submissionGuidance: 'Some guidance text'
        })
      )
      const formAdapterMessageWithUserEmail = structuredClone(
        formAdapterSubmissionMessage
      )
      formAdapterMessageWithUserEmail.meta.custom = {
        userConfirmationEmail: 'my-email@test.com'
      }
      jest.mocked(sendNotification).mockRejectedValueOnce(err)
      await expect(
        sendUserConfirmationEmail(formAdapterMessageWithUserEmail)
      ).rejects.toThrow(err)
    })

    it('should handle and throw errors', async () => {
      const err = new Error('Upstream failure')
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      jest.mocked(sendNotification).mockRejectedValueOnce(err)
      await expect(
        sendNotifyEmails(formAdapterSubmissionMessage)
      ).rejects.toThrow(err)
    })

    it('should use versionMetadata when present', async () => {
      const versionNumber = 9
      const versionedFormSubmissionMeta =
        buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Versioned form',
          formSlug: 'versioned-form',
          isPreview: false,
          status: FormStatus.Live,
          notificationEmail: 'notificationEmail@example.uk',
          referenceNumber,
          formId,
          versionMetadata: {
            versionNumber,
            createdAt: new Date('2025-09-10T12:03:05.042Z')
          }
        })

      const versionedFormAdapterSubmissionMessage =
        buildFormAdapterSubmissionMessage({
          meta: versionedFormSubmissionMeta,
          data: formSubmissionData,
          result: formSubmissionResult
        })

      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      await sendNotifyEmails(versionedFormAdapterSubmissionMessage)

      expect(getFormDefinition).toHaveBeenCalledWith(
        formId,
        FormStatus.Live,
        undefined // TODO re-enable once we have a proper fix for 20260115 issue: versionNumber
      )
    })

    it('should use default form definition when versionMetadata is not present', async () => {
      jest.mocked(getFormDefinition).mockResolvedValueOnce(baseDefinition)
      await sendNotifyEmails(formAdapterSubmissionMessage)

      expect(getFormDefinition).toHaveBeenCalledWith(
        formId,
        FormStatus.Live,
        undefined
      )
    })
  })
})

/**
 * @import { Output } from '@defra/forms-model'
 */
