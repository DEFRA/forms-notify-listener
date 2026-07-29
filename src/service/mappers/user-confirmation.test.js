import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'
import {
  buildDeclarationFieldComponent,
  buildDefinition,
  buildMetaData,
  buildQuestionPage,
  buildYesNoFieldComponent
} from '@defra/forms-model/stubs'

import { EN_GB } from '~/src/i18n/translations-helper.js'
import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import { testTranslationsDefinition } from '~/src/service/mappers/formatters/__stubs__/translator.js'
import { getUserConfirmationEmailBody } from '~/src/service/mappers/user-confirmation.js'
import { createAndPopulatei18nInstance } from '~/src/service/notify.js'

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
  const formSubmissionMessage = buildFormAdapterSubmissionMessage({
    data: {
      main: {
        DeclarationField: 'true',
        YesNoField: false
      },
      repeaters: {},
      files: {}
    }
  })
  const formDefinition = buildDefinition({
    pages: [
      buildQuestionPage({
        components: [
          buildYesNoFieldComponent({
            name: 'YesNoField'
          }),
          buildDeclarationFieldComponent({
            name: 'DeclarationField',
            content: 'Declaration content in englush'
          })
        ]
      })
    ]
  })

  test('should handle general email content', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    const formDefinitionWithRefNum = structuredClone(formDefinition)
    formDefinitionWithRefNum.options = { showReferenceNumber: true }
    const i18Instance = createAndPopulatei18nInstance(
      metadata,
      formDefinitionWithRefNum
    )
    const translator = createTranslator(i18Instance, EN_GB)

    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinitionWithRefNum,
        translator
      )
    ).toBe(
      `
# Form submitted
^ Your reference number: 576-225-943

We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

# What happens next
Some submission guidance

# Get help


# Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

---
# YesNo Field Component

No

# Declaration

I understand and agree

`
    )
  })

  test('should handle general email content in Welsh', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    const formDefinitionWithRefNum = structuredClone(formDefinition)
    formDefinitionWithRefNum.options = { showReferenceNumber: true }
    formDefinitionWithRefNum.metadata = {
      translations: {
        cy: {
          'form.submissionGuidance':
            'Something in welsh for submission guidance'
        }
      }
    }
    const i18Instance = createAndPopulatei18nInstance(
      metadata,
      formDefinitionWithRefNum
    )
    const welshTranslator = createTranslator(i18Instance, 'cy')

    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinitionWithRefNum,
        welshTranslator
      )
    ).toBe(
      `
# Ffurflen wedi'i chyflwyno
^ Eich cyfeirnod: 576-225-943

Gwnaethom dderbyn eich ffurflen ar gyfer &lsquo;My Form Name&rsquo; am 2:21pm on dydd Mawrth 4 Tachwedd 2025.

# Beth sy'n digwydd nesaf
Something in welsh for submission guidance

# Cael cymorth


# Eich atebion
Cewch gopi o'ch atebion ar waelod yr e-bost hwn.

Peidiwch ag ymateb i'r e-bost hwn. Nid ydym yn monitro atebion i'r cyfeiriad e-bost hwn.

Oddi wrth Defra

---
# YesNo Field Component

Nage

# Declaration

Rwy\\'n deall ac yn cytuno

`
    )
  })

  test('should handle missing submission guidance', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+00:00')
    const metadata = buildMetaData()
    const i18Instance = createAndPopulatei18nInstance(metadata, formDefinition)
    const translator = createTranslator(i18Instance, EN_GB)
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition,
        translator
      )
    ).toBe(
      `
# Form submitted
We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

# What happens next
Define this text in the 'What happens next' section of the form overview

# Get help


# Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

---
# YesNo Field Component

No

# Declaration

I understand and agree

`
    )
  })

  test('should handle time shift - plus 1 hour', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-11-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    const i18Instance = createAndPopulatei18nInstance(metadata, formDefinition)
    const translator = createTranslator(i18Instance, EN_GB)
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition,
        translator
      )
    ).toContain(' at 1:21pm on Tuesday 4 November 2025.')
  })

  test('should handle time shift - plus 1 hour in BST', () => {
    const formName = 'My Form Name'
    const submissionDate = new Date('2025-05-04T14:21:35+01:00')
    const metadata = buildMetaData({
      submissionGuidance: 'Some submission guidance'
    })
    const i18Instance = createAndPopulatei18nInstance(metadata, formDefinition)
    const translator = createTranslator(i18Instance, EN_GB)
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition,
        translator
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
    const i18Instance = createAndPopulatei18nInstance(
      metadata,
      testTranslationsDefinition
    )
    const translator = createTranslator(i18Instance, EN_GB)
    expect(
      getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition,
        translator
      )
    ).toBe(
      `
# Form submitted
We received your form submission for &lsquo;My Form Name&rsquo; at 2:21pm on Tuesday 4 November 2025.

# What happens next
Some submission guidance

# Get help
0121 123456789

[our-email@test.com](mailto:our-email@test.com)
We will respond within 5 working days

[This is our online url](https://some-online-help.com)



# Your answers
Find a copy of your answers at the bottom of this email.

Do not reply to this email. We do not monitor replies to this email address.

From Defra

---
# YesNo Field Component

No

# Declaration

I understand and agree

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
          payment: {
            paymentId: 'pay_abc123',
            reference: 'REF-123-456',
            amount: 300,
            description: 'Application fee',
            createdAt: '2025-11-10T17:01:29.000Z'
          }
        }
      })

      const i18Instance = createAndPopulatei18nInstance(
        metadata,
        testTranslationsDefinition
      )
      const translator = createTranslator(i18Instance, EN_GB)

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithPayment,
        formDefinition,
        translator
      )

      expect(result).toContain('# Your payment of £300.00 was successful')
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

      const i18Instance = createAndPopulatei18nInstance(
        metadata,
        testTranslationsDefinition
      )
      const translator = createTranslator(i18Instance, EN_GB)

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        formSubmissionMessage,
        formDefinition,
        translator
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

      const messageWithNoPayment = buildFormAdapterSubmissionMessage({
        data: {
          main: {},
          repeaters: {},
          files: {}
        }
      })

      const i18Instance = createAndPopulatei18nInstance(
        metadata,
        testTranslationsDefinition
      )
      const translator = createTranslator(i18Instance, EN_GB)

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithNoPayment,
        formDefinition,
        translator
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
          payment: {
            paymentId: 'pay_abc123',
            reference: 'REF-123-456',
            amount: 50,
            description: 'Processing fee',
            createdAt: '2025-11-10T10:30:00.000Z'
          }
        }
      })

      const i18Instance = createAndPopulatei18nInstance(
        metadata,
        testTranslationsDefinition
      )
      const translator = createTranslator(i18Instance, EN_GB)

      const result = getUserConfirmationEmailBody(
        formName,
        submissionDate,
        metadata,
        messageWithPayment,
        formDefinition,
        translator
      )

      const submissionTextIndex = result.indexOf('We received your form')
      const paymentIndex = result.indexOf(
        '# Your payment of £50.00 was successful'
      )
      const whatHappensNextIndex = result.indexOf('# What happens next')

      expect(paymentIndex).toBeGreaterThan(submissionTextIndex)
      expect(paymentIndex).toBeLessThan(whatHappensNextIndex)
    })
  })
})
