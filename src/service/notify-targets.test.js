import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/engine/types/enums.js'
import { FormStatus } from '@defra/forms-model'
import { buildMetaData } from '@defra/forms-model/stubs'
import Boom from '@hapi/boom'

import { logger } from '~/src/helpers/logging/logger.js'
import { getFormDefinition, getFormMetadata } from '~/src/lib/manager.js'
import { sendNotification } from '~/src/lib/notify.js'
import { republishEventMessage } from '~/src/messaging/event.js'
import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageMetaStub
} from '~/src/service/__stubs__/event-builders.js'
import {
  definitionForEmail,
  definitionForFeedbackForm
} from '~/src/service/__stubs__/forms.js'
import {
  buildNotificationTargetList,
  isRetryableSendError,
  sendNotifyEmailsForTargets
} from '~/src/service/notify-targets.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
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
jest.mock('~/src/messaging/event.js')
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      switch (key) {
        case 'notifyTemplateId':
          return 'notify-template-id-1'
        case 'notifyReplyToId':
          return 'notify-reply-to-id-1'
        case 'notifyMaxSendAttempts':
          return 3
        case 'notifySendBackoffMs':
          return 1
        case 'notifySendBudgetMs':
          return 18000
        case 'notifyMaxRequeues':
          return 10
        case 'fileExpiryInMonths':
          return 9
        default:
          return 'mock-value'
      }
    })
  }
}))

describe('notify-targets', () => {
  const formId = '68a8b0449ab460290c28940a'
  const referenceNumber = '576-225-943'
  const teamInbox = 'team@example.uk'
  const secondInbox = 'second-team@example.uk'
  const submitterEmail = 'submitter@example.com'

  /**
   * @param {FormAdapterNotificationTarget[]} notificationTargets
   * @param {Record<string, unknown>} [custom]
   * @returns {FormAdapterSubmissionMessage}
   */
  function buildTargetsMessage(notificationTargets, custom) {
    return buildFormAdapterSubmissionMessage({
      meta: buildFormAdapterSubmissionMessageMetaStub({
        schemaVersion: FormAdapterSubmissionSchemaVersion.V2,
        formName: 'Order a pizza',
        formSlug: 'order-a-pizza',
        status: FormStatus.Live,
        notificationEmail: teamInbox,
        referenceNumber,
        formId,
        custom
      }),
      notificationTargets
    })
  }

  /**
   * @param {string} emailAddress
   * @returns {FormAdapterNotificationTarget}
   */
  function humanTarget(emailAddress) {
    return { emailAddress, audience: 'human', version: '2' }
  }

  /** Addresses passed to Notify, in call order */
  function sentTo() {
    return jest
      .mocked(sendNotification)
      .mock.calls.map(([args]) => args.emailAddress)
  }

  /** Every string this test run handed to the logger */
  function loggedText() {
    return [
      ...jest.mocked(logger.info).mock.calls,
      ...jest.mocked(logger.error).mock.calls
    ]
      .flat()
      .filter((arg) => typeof arg === 'string')
      .join('\n')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getFormDefinition).mockResolvedValue(definitionForEmail)
    jest
      .mocked(getFormMetadata)
      .mockResolvedValue(buildMetaData({ submissionGuidance: 'Some guidance' }))
    jest.mocked(sendNotification).mockResolvedValue({ response: {}, body: {} })
    jest.mocked(republishEventMessage).mockResolvedValue('new-message-id')
  })

  describe('buildNotificationTargetList', () => {
    it('returns a copy, leaving the message untouched', () => {
      const message = buildTargetsMessage([humanTarget(teamInbox)])

      const targets = buildNotificationTargetList(message)
      targets[0].sent = true

      expect(message.notificationTargets?.[0].sent).toBeUndefined()
    })

    it('adds a confirmation target for the submitter', () => {
      const message = buildTargetsMessage([humanTarget(teamInbox)], {
        userConfirmationEmail: submitterEmail
      })

      expect(buildNotificationTargetList(message)).toEqual([
        humanTarget(teamInbox),
        {
          emailAddress: submitterEmail,
          audience: 'human',
          version: '2',
          type: 'confirmation'
        }
      ])
    })

    it('does not add a second confirmation target on a requeue', () => {
      const message = buildTargetsMessage(
        [
          { ...humanTarget(teamInbox), sent: true },
          {
            emailAddress: submitterEmail,
            audience: 'human',
            version: '2',
            type: 'confirmation'
          }
        ],
        { userConfirmationEmail: submitterEmail }
      )

      expect(buildNotificationTargetList(message)).toHaveLength(2)
    })

    it('adds nothing when the submitter did not ask for a confirmation', () => {
      const message = buildTargetsMessage([humanTarget(teamInbox)])

      expect(buildNotificationTargetList(message)).toEqual([
        humanTarget(teamInbox)
      ])
    })
  })

  describe('isRetryableSendError', () => {
    it.each([
      ['a rate limit', 429],
      ['a Notify outage', 500],
      ['a connection failure', 502],
      ['a request timeout', 504]
    ])('retries %s', (_description, statusCode) => {
      expect(
        isRetryableSendError(Boom.boomify(new Error('nope'), { statusCode }))
      ).toBe(true)
    })

    it.each([
      ['a rejected recipient', 400],
      ['a bad API key', 403]
    ])('does not retry %s', (_description, statusCode) => {
      expect(
        isRetryableSendError(Boom.boomify(new Error('nope'), { statusCode }))
      ).toBe(false)
    })

    it('retries anything that is not an HTTP failure', () => {
      expect(isRetryableSendError(new Error('formatter blew up'))).toBe(true)
    })
  })

  describe('sendNotifyEmailsForTargets', () => {
    it('sends to every target and acknowledges', async () => {
      const message = buildTargetsMessage([
        humanTarget(teamInbox),
        humanTarget(secondInbox)
      ])

      await sendNotifyEmailsForTargets(message)

      expect(sentTo()).toEqual([teamInbox, secondInbox])
      expect(republishEventMessage).not.toHaveBeenCalled()
    })

    it('sends the confirmation email alongside the submission emails', async () => {
      const message = buildTargetsMessage([humanTarget(teamInbox)], {
        userConfirmationEmail: submitterEmail
      })

      await sendNotifyEmailsForTargets(message)

      expect(sentTo()).toEqual([teamInbox, submitterEmail])
      expect(
        jest.mocked(sendNotification).mock.calls[1][0].notifyReplyToId
      ).toBe('notify-reply-to-id-1')
    })

    it('skips targets a previous delivery already reached', async () => {
      const message = buildTargetsMessage([
        { ...humanTarget(teamInbox), sent: true, sendAttempts: 1 },
        humanTarget(secondInbox)
      ])

      await sendNotifyEmailsForTargets(message)

      expect(sentTo()).toEqual([secondInbox])
    })

    it('does nothing when every target has already been reached', async () => {
      const message = buildTargetsMessage([
        { ...humanTarget(teamInbox), sent: true }
      ])

      await sendNotifyEmailsForTargets(message)

      expect(sendNotification).not.toHaveBeenCalled()
      expect(republishEventMessage).not.toHaveBeenCalled()
    })

    it('sends nothing for a feedback form', async () => {
      jest
        .mocked(getFormDefinition)
        .mockResolvedValue(definitionForFeedbackForm)

      await sendNotifyEmailsForTargets(
        buildTargetsMessage([humanTarget(teamInbox)])
      )

      expect(sendNotification).not.toHaveBeenCalled()
    })

    it('retries a transient failure and carries on', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValueOnce(
          Boom.boomify(new Error('rate limited'), { statusCode: 429 })
        )

      await sendNotifyEmailsForTargets(
        buildTargetsMessage([humanTarget(teamInbox)])
      )

      expect(sentTo()).toEqual([teamInbox, teamInbox])
      expect(republishEventMessage).not.toHaveBeenCalled()
    })

    it('gives up after the configured number of attempts', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await expect(
        sendNotifyEmailsForTargets(
          buildTargetsMessage([humanTarget(teamInbox)])
        )
      ).rejects.toThrow('All 1 notification email(s) failed')

      expect(sendNotification).toHaveBeenCalledTimes(3)
    })

    it('does not retry a permanently rejected recipient', async () => {
      jest.mocked(sendNotification).mockRejectedValue(
        Boom.boomify(new Error('email address is blocked'), {
          statusCode: 400
        })
      )

      await expect(
        sendNotifyEmailsForTargets(
          buildTargetsMessage([humanTarget(teamInbox)])
        )
      ).rejects.toThrow('All 1 notification email(s) failed')

      expect(sendNotification).toHaveBeenCalledTimes(1)
    })

    it('throws without requeueing when nothing got through', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await expect(
        sendNotifyEmailsForTargets(
          buildTargetsMessage([
            humanTarget(teamInbox),
            humanTarget(secondInbox)
          ])
        )
      ).rejects.toThrow('All 2 notification email(s) failed')

      expect(republishEventMessage).not.toHaveBeenCalled()
    })

    it('requeues only the outstanding targets on a partial failure', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: {} })
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      const message = buildTargetsMessage([
        humanTarget(teamInbox),
        humanTarget(secondInbox)
      ])

      await expect(sendNotifyEmailsForTargets(message)).resolves.toBeUndefined()

      expect(republishEventMessage).toHaveBeenCalledTimes(1)

      const [replacedMessageId, body] = jest.mocked(republishEventMessage).mock
        .calls[0]
      expect(replacedMessageId).toBe(message.messageId)

      /** @type {FormAdapterSubmissionMessagePayload} */
      const payload = JSON.parse(body)
      expect(payload.notificationTargets).toEqual([
        { ...humanTarget(teamInbox), sent: true, sendAttempts: 1 },
        { ...humanTarget(secondInbox), sendAttempts: 3 }
      ])
      expect(payload.meta.custom).toEqual({
        notifyRequeueCount: 1,
        notifyRequeuedFrom: message.messageId
      })
      expect(payload.data).toEqual(JSON.parse(JSON.stringify(message.data)))
      expect(payload.result).toEqual(message.result)
    })

    it('keeps the requeue count climbing across passes', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: {} })
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await sendNotifyEmailsForTargets(
        buildTargetsMessage(
          [humanTarget(teamInbox), humanTarget(secondInbox)],
          { notifyRequeueCount: 4 }
        )
      )

      const [, body] = jest.mocked(republishEventMessage).mock.calls[0]
      expect(JSON.parse(body).meta.custom.notifyRequeueCount).toBe(5)
    })

    it('refuses to requeue past the configured limit', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: {} })
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await expect(
        sendNotifyEmailsForTargets(
          buildTargetsMessage(
            [humanTarget(teamInbox), humanTarget(secondInbox)],
            { notifyRequeueCount: 10 }
          )
        )
      ).rejects.toThrow('refusing to requeue again')

      expect(republishEventMessage).not.toHaveBeenCalled()
    })

    it('reports how many emails failed without naming them', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: {} })
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await sendNotifyEmailsForTargets(
        buildTargetsMessage([humanTarget(teamInbox), humanTarget(secondInbox)])
      )

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `1 of 2 notification email(s) failed for submission ${referenceNumber}`
        )
      )

      const logged = loggedText()
      expect(logged).not.toContain(teamInbox)
      expect(logged).not.toContain(secondInbox)
    })

    it('does not name the submitter when their confirmation fails', async () => {
      jest
        .mocked(sendNotification)
        .mockResolvedValueOnce({ response: {}, body: {} })
        .mockRejectedValue(
          Boom.boomify(new Error('Notify is down'), { statusCode: 500 })
        )

      await sendNotifyEmailsForTargets(
        buildTargetsMessage([humanTarget(teamInbox)], {
          userConfirmationEmail: submitterEmail
        })
      )

      expect(loggedText()).not.toContain(submitterEmail)
    })

    it('loads the confirmation email context once, however many retries it takes', async () => {
      jest
        .mocked(sendNotification)
        .mockRejectedValueOnce(
          Boom.boomify(new Error('rate limited'), { statusCode: 429 })
        )
        .mockRejectedValueOnce(
          Boom.boomify(new Error('rate limited'), { statusCode: 429 })
        )
        .mockResolvedValue({ response: {}, body: {} })

      await sendNotifyEmailsForTargets(
        buildTargetsMessage([], { userConfirmationEmail: submitterEmail })
      )

      expect(getFormMetadata).toHaveBeenCalledTimes(1)
    })

    it('does not fetch form metadata when there is no confirmation email', async () => {
      await sendNotifyEmailsForTargets(
        buildTargetsMessage([humanTarget(teamInbox)])
      )

      expect(getFormMetadata).not.toHaveBeenCalled()
    })
  })
})

/**
 * @import { FormAdapterNotificationTarget, FormAdapterSubmissionMessage, FormAdapterSubmissionMessagePayload } from '@defra/forms-engine-plugin/engine/types.js'
 */
