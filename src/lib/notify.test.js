import { postJson } from '~/src/lib/fetch.js'
import {
  escapeContent,
  escapeFileLabel,
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

  describe('escapeContent', () => {
    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(undefined)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(123)).toBe('')
      // @ts-expect-error - testing invalid input
      expect(escapeContent({})).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeContent('')).toBe('')
    })

    it('should handle regular text without special characters', () => {
      expect(escapeContent('Hello World')).toBe('Hello World')
    })

    it('should escape hyphen at start of line with backslash', () => {
      expect(escapeContent('-list item')).toBe('\\-list item')
    })

    it('should escape asterisk at start of line with backslash', () => {
      expect(escapeContent('*bold start')).toBe('\\*bold start')
    })

    it('should escape hash at start of line with backslash', () => {
      expect(escapeContent('#heading')).toBe('\\#heading')
    })

    it('should replace tabs with 4 non-breaking spaces', () => {
      expect(escapeContent('before\tafter')).toBe(
        'before&nbsp;&nbsp;&nbsp;&nbsp;after'
      )
    })

    it('should replace spaces around hyphens with non-breaking spaces', () => {
      expect(escapeContent('word - word')).toBe('word&nbsp;-&nbsp;word')
    })

    it('should replace multiple spaces around hyphens with non-breaking spaces', () => {
      expect(escapeContent('word  -  word')).toBe(
        'word&nbsp;&nbsp;-&nbsp;&nbsp;word'
      )
    })

    it('should replace triple backticks on their own line with spaced backticks', () => {
      expect(escapeContent('```')).toBe('` ` `')
      expect(escapeContent('before\n```\nafter')).toBe('before\n` ` `\nafter')
    })

    it('should not replace triple backticks that are part of other content', () => {
      expect(escapeContent('some ``` code')).toBe('some ``` code')
    })

    it('should replace spaces before periods with non-breaking spaces', () => {
      expect(escapeContent('word .')).toBe('word&nbsp;.')
    })

    it('should replace spaces before commas with non-breaking spaces', () => {
      expect(escapeContent('word ,')).toBe('word&nbsp;,')
    })

    it('should insert space between ] and ( in markdown links', () => {
      expect(escapeContent('[text](url)')).toBe('[text] (url)')
    })

    it('should handle content with multiple rules applied', () => {
      expect(escapeContent('- item with - dash')).toBe(
        '\\- item with&nbsp;-&nbsp;dash'
      )
    })

    it('should handle multiline content with start-of-line characters', () => {
      expect(escapeContent('normal\n-list\n*bold\n#heading')).toBe(
        'normal\n\\-list\n\\*bold\n\\#heading'
      )
    })

    it('should not escape special characters in the middle of text', () => {
      expect(escapeContent('snake_case')).toBe('snake_case')
      expect(escapeContent('some*text*here')).toBe('some*text*here')
    })

    it('should handle HTML entity encoded markdown links', () => {
      expect(escapeContent('text&rsqb;&lpar;url')).toBe('text&rsqb; &lpar;url')
    })
  })
})
