import { postJson } from '~/src/lib/fetch.js'
import {
  escapeAnswer,
  escapeFileLabel,
  escapeSingleLineAnswer,
  escapeSubject,
  sendNotification
} from '~/src/lib/notify.js'

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

  describe('escapeFileLabel', () => {
    it.each([
      {
        inStr: 'This is a normal sentence without hyphens',
        outStr:
          'This&nbsp;is&nbsp;a&nbsp;normal&nbsp;sentence&nbsp;without&nbsp;hyphens'
      },
      {
        inStr: 'This has one hyphen - in the middle',
        outStr:
          'This&nbsp;has&nbsp;one&nbsp;hyphen&nbsp;-&nbsp;in&nbsp;the&nbsp;middle'
      },
      {
        inStr: '-This has multiple hyphens - here - here - and here-',
        outStr:
          '-This&nbsp;has&nbsp;multiple&nbsp;hyphens&nbsp;-&nbsp;here&nbsp;-&nbsp;here&nbsp;-&nbsp;and&nbsp;here-'
      },
      {
        inStr:
          'This has various whitespace - plus punctuations     ,     .     :     ;     !  ',
        outStr:
          'This&nbsp;has&nbsp;various&nbsp;whitespace&nbsp;-&nbsp;plus&nbsp;punctuations&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;!&nbsp;&nbsp;'
      },
      {
        inStr:
          'This has multiples and tabs   ,   .   .      ,   \t  \t      . ',
        outStr:
          'This&nbsp;has&nbsp;multiples&nbsp;and&nbsp;tabs&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.&nbsp;'
      }
    ])("formats '$inStr' to '$outStr'", ({ inStr, outStr }) => {
      expect(escapeFileLabel(inStr)).toBe(outStr)
    })

    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeFileLabel(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeFileLabel(undefined)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeFileLabel(123)).toBe('')
      // @ts-expect-error - testing invalid input
      expect(escapeFileLabel({})).toBe('')
      // @ts-expect-error - testing invalid input
      expect(escapeFileLabel([])).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeFileLabel('')).toBe('')
    })

    it('should replace tabs with 4 non-breaking spaces', () => {
      expect(escapeFileLabel('before\tafter')).toBe(
        'before&nbsp;&nbsp;&nbsp;&nbsp;after'
      )
    })

    it('should handle filenames with underscores and dots', () => {
      expect(escapeFileLabel('my_document.pdf')).toBe('my_document.pdf')
    })

    it('should handle filenames with spaces', () => {
      expect(escapeFileLabel('my document.pdf')).toBe('my&nbsp;document.pdf')
    })
  })

  describe('escapeSingleLineAnswer', () => {
    it('should wrap answer in triple backticks code block', () => {
      expect(escapeSingleLineAnswer('Hello World')).toBe(
        '```\r\nHello World\r\n```'
      )
    })

    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeSingleLineAnswer(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeSingleLineAnswer(undefined)).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeSingleLineAnswer('')).toBe('```\r\n\r\n```')
    })

    it('should preserve content with special characters', () => {
      const input = 'Test with *asterisks* and _underscores_ and [brackets]'
      expect(escapeSingleLineAnswer(input)).toBe(`\`\`\`\r\n${input}\r\n\`\`\``)
    })

    it('should preserve content with markdown syntax', () => {
      const input = '# Heading\n- List item\n**Bold**'
      expect(escapeSingleLineAnswer(input)).toBe(`\`\`\`\r\n${input}\r\n\`\`\``)
    })

    it('should preserve content with URLs', () => {
      const input = 'Visit https://example.com for more info'
      expect(escapeSingleLineAnswer(input)).toBe(`\`\`\`\r\n${input}\r\n\`\`\``)
    })

    it('should handle numeric input', () => {
      expect(escapeSingleLineAnswer(12345)).toBe('```\r\n12345\r\n```')
    })

    it('should escape triple backticks with by putting spaces between them', () => {
      const input = 'start ``` end'
      expect(escapeSingleLineAnswer(input)).toBe(
        `\`\`\`\r\nstart \` \` \` end\r\n\`\`\``
      )
    })
  })

  describe('escapeAnswer', () => {
    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeAnswer(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeAnswer(undefined)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeAnswer(123)).toBe('')
      // @ts-expect-error - testing invalid input
      expect(escapeAnswer({})).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeAnswer('')).toBe('')
    })

    it('should escape markdown special characters', () => {
      expect(escapeAnswer('*bold*')).toContain('\\*')
    })

    it('should escape underscores', () => {
      expect(escapeAnswer('snake_case')).toContain('\\_')
    })

    it('should handle regular text without special characters', () => {
      expect(escapeAnswer('Hello World')).toBe('Hello World')
    })
  })

  describe('escapeSubject', () => {
    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeSubject(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeSubject(undefined)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeSubject(123)).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeSubject('')).toBe('')
    })

    it('should escape markdown special characters in subject', () => {
      expect(escapeSubject('*important*')).toContain('\\*')
    })

    it('should handle regular text without special characters', () => {
      expect(escapeSubject('Form Submission Received')).toBe(
        'Form Submission Received'
      )
    })

    it('should use the same escaping as escapeAnswer', () => {
      const testString = 'Test_with_underscores'
      expect(escapeSubject(testString)).toBe(escapeAnswer(testString))
    })
  })
})
