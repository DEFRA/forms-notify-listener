import { postJson } from '~/src/lib/fetch.js'
import { sendNotification } from '~/src/lib/notify.js'

jest.mock('~/src/lib/fetch.js')

describe('Utils: Notify', () => {
  const templateId = 'example-template-id'
  const emailAddress = 'enrique.chase@defra.gov.uk'
  const personalisation = {
    subject: 'Hello',
    body: 'World'
  }

  describe('sendNotification', () => {
    it('calls postJson with personalised email payload', async () => {
      await sendNotification({
        templateId,
        emailAddress,
        personalisation
      })

      expect(postJson).toHaveBeenCalledWith(
        new URL(
          '/v2/notifications/email',
          'https://api.notifications.service.gov.uk'
        ),
        {
          payload: {
            template_id: templateId,
            email_address: emailAddress,
            personalisation
          },
          headers: {
            Authorization: expect.stringMatching(/^Bearer /)
          }
        }
      )
    })
  })
})
