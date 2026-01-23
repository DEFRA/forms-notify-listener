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

  test('should handle general email content', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    const formDefinitionWithRefNum = structuredClone(formDefinition)
    formDefinitionWithRefNum.options = { showReferenceNumber: true }
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinitionWithRefNum
      )
    ).toBe(
      `
# Form submitted
^ Your reference number: 576-225-943

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

  describe('payment details', () => {
    test('should include payment success section when payment exists', () => {
      const formName = 'My Form Name'
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData({
        submissionGuidance: 'Some submission guidance'
      })

      const messageWithPayment = buildFormAdapterSubmissionMessage({
        data: {
          main: {},
          repeaters: {},
          files: {},
          payments: {
            paymentComponent: {
              paymentId: 'pay_abc123',
              reference: 'REF-123-456',
              amount: 300,
              description: 'Application fee',
              createdAt: '2025-11-10T17:01:29.000Z'
            }
          }
        }
      })

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithPayment,
        formDefinition
      )

      expect(result).toContain('# Your payment of £300 was successful')
      expect(result).toContain('## Payment for')
      expect(result).toContain('Application fee')
      expect(result).toContain('## Total amount')
      expect(result).toContain('£300')
      expect(result).toContain('## Date of payment')
      expect(result).toContain('5:01pm on 10 November 2025')
    })

    test('should not include payment section when no payment exists', () => {
      const formName = 'My Form Name'
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData({
        submissionGuidance: 'Some submission guidance'
      })

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition
      )

      expect(result).not.toContain('# Your payment of')
      expect(result).not.toContain('## Payment for')
      expect(result).not.toContain('## Total amount')
      expect(result).not.toContain('## Date of payment')
    })

    test('should not include payment section when payments object is empty', () => {
      const formName = 'My Form Name'
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData({
        submissionGuidance: 'Some submission guidance'
      })

      const messageWithEmptyPayments = buildFormAdapterSubmissionMessage({
        data: {
          main: {},
          repeaters: {},
          files: {},
          payments: {}
        }
      })

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithEmptyPayments,
        formDefinition
      )

      expect(result).not.toContain('# Your payment of')
    })

    test('should place payment section after submission text and before what happens next', () => {
      const formName = 'My Form Name'
      const submissionDate = new Date('2025-11-04T14:21:35+00:00')
      const metadata = buildMetaData({
        submissionGuidance: 'Some submission guidance'
      })

      const messageWithPayment = buildFormAdapterSubmissionMessage({
        data: {
          main: {},
          repeaters: {},
          files: {},
          payments: {
            paymentComponent: {
              paymentId: 'pay_abc123',
              reference: 'REF-123-456',
              amount: 50,
              description: 'Processing fee',
              createdAt: '2025-11-10T10:30:00.000Z'
            }
          }
        }
      })

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithPayment,
        formDefinition
      )

      const submissionTextIndex = result.indexOf('We received your form')
      const paymentIndex = result.indexOf('# Your payment of £50 was successful')
      const whatHappensNextIndex = result.indexOf('## What happens next')

      expect(paymentIndex).toBeGreaterThan(submissionTextIndex)
      expect(paymentIndex).toBeLessThan(whatHappensNextIndex)
    })
  })
})
