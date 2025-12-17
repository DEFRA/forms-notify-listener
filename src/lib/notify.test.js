import { postJson } from '~/src/lib/fetch.js'
import { escapeNotifyContent, sendNotification } from '~/src/lib/notify.js'

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

  describe('escapeNotifyContent', () => {
    it.each([
      {
        inStr: 'This is a normal sentence without hyphens',
        outStr:
          'This&nbsp;is&nbsp;a&nbsp;normal&nbsp;sentence&nbsp;without&nbsp;hyphens'
      },
      {
        inStr: 'This has one hyphen - in the middle',
        outStr:
          'This&nbsp;has&nbsp;one&nbsp;hyphen&nbsp;&hyphen;&nbsp;in&nbsp;the&nbsp;middle'
      },
      {
        inStr: '-This has multiple hyphens - here - here - and here-',
        outStr:
          '&hyphen;This&nbsp;has&nbsp;multiple&nbsp;hyphens&nbsp;&hyphen;&nbsp;here&nbsp;&hyphen;&nbsp;here&nbsp;&hyphen;&nbsp;and&nbsp;here&hyphen;'
      },
      {
        inStr:
          'This has various whitespace - plus punctuations     ,     .     :     ;     !  ',
        outStr:
          'This&nbsp;has&nbsp;various&nbsp;whitespace&nbsp;&hyphen;&nbsp;plus&nbsp;punctuations&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;!&nbsp;&nbsp;'
      },
      {
        inStr:
          'This has multiples and tabs   ,   .   .      ,   \t  \t      . ',
        outStr:
          'This&nbsp;has&nbsp;multiples&nbsp;and&nbsp;tabs&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.&nbsp;'
      }
    ])("formats '$inStr' to '$outStr'", ({ inStr, outStr }) => {
      expect(escapeNotifyContent(inStr)).toBe(outStr)
    })
  })
})
