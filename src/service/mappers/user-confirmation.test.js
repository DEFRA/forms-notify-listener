import { buildDefinition, buildMetaData } from '@defra/forms-model/stubs'

import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import { getUserConfirmationEmailBody } from '~/src/service/mappers/user-confirmation.js'

jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})

describe('user-confirmation', () => {
  const formSubmissionMessage = buildFormAdapterSubmissionMessage()
  const formDefinition = buildDefinition()

  describe('validation', () => {
    test('should throw TypeError for empty formName', () => {
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          '',
          submissionDate,
          metadata,
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow(TypeError)
      expect(() =>
        getUserConfirmationEmailBody(
          '',
          submissionDate,
          metadata,
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow('formName is required and must be a non-empty string')
    })

    test('should throw TypeError for whitespace-only formName', () => {
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          '   ',
          submissionDate,
          metadata,
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow('formName is required and must be a non-empty string')
    })

    test('should throw TypeError for invalid submissionDate', () => {
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          'My Form',
          new Date('invalid'),
          metadata,
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow('submissionDate is required and must be a valid Date')
    })

    test('should throw TypeError for null submissionDate', () => {
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          'My Form',
          /** @type {any} */ (null),
          metadata,
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow('submissionDate is required and must be a valid Date')
    })

    test('should throw TypeError for missing metadata', () => {
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')

      expect(() =>
        getUserConfirmationEmailBody(
          'My Form',
          submissionDate,
          /** @type {any} */ (null),
          formSubmissionMessage,
          formDefinition
        )
      ).toThrow('metadata is required')
    })

    test('should throw TypeError for missing formSubmissionMessage', () => {
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          'My Form',
          submissionDate,
          metadata,
          /** @type {any} */ (null),
          formDefinition
        )
      ).toThrow('formSubmissionMessage is required')
    })

    test('should throw TypeError for missing formDefinition', () => {
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData()

      expect(() =>
        getUserConfirmationEmailBody(
          'My Form',
          submissionDate,
          metadata,
          formSubmissionMessage,
          /** @type {any} */ (null)
        )
      ).toThrow('formDefinition is required')
    })
  })

  test('should handle general email content', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )
    ).toBe(
      `
# Form submitted
We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

## What happens next
Some submission guidance

## Get help


## Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

`
    )
  })

  test('should handle missing submission guidance', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData()
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )
    ).toBe(
      `
# Form submitted
We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

## What happens next
Define this text in the 'What happens next' section of the form overview

## Get help


## Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

`
    )
  })

  test('should handle time shift - plus 1 hour', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )
    ).toContain(' at 1:21pm on Tuesday 4 November 2025.')
  })

  test('should handle time shift - plus 1 hour in BST', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-05-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )
    ).toContain(' at 2:21pm on Sunday 4 May 2025.')
  })

  test('should handle contact details', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance',
      contact: {
        phone: '0121 123456789',
        email: {
          address: 'our-email@test.com',
          responseTime: 'We will respond within 5 working days'
        },
        online: {
          url: 'https://some-online-help.com',
          text: 'This is our online url'
        }
      }
    })
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )
    ).toBe(
      `
# Form submitted
We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

## What happens next
Some submission guidance

## Get help
0121 123456789

[our-email@test.com](mailto:our-email@test.com)
We will respond within 5 working days

[This is our online url](https://some-online-help.com)



## Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

`
    )
  })
})
