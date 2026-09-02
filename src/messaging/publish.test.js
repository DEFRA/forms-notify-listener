import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { mockClient } from 'aws-sdk-client-mock'

import 'aws-sdk-client-mock-jest'
import { publishEvent } from '~/src/messaging/publish.js'

const emailsSnsTopicArn =
  'arn:aws:sns:eu-west-2:000000000000:forms_notify_email_events'

jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn().mockReturnValue(emailsSnsTopicArn)
  }
}))

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn()
  }
}))

describe('publish', () => {
  const snsMock = mockClient(SNSClient)

  afterEach(() => {
    snsMock.reset()
  })

  describe('publishEvent', () => {
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
      snsMock.on(PublishCommand).resolves({
        MessageId: '00000000-0000-0000-0000-000000000000'
      })

      await publishEvent(message)
      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        TopicArn: emailsSnsTopicArn,
        Message: JSON.stringify(message)
      })
    })
  })
})
