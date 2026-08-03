import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'
import { buildDefinition } from '@defra/forms-model/stubs'

import { EN_GB } from '~/src/i18n/translations-helper.js'
import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import { extractPaymentDetails } from '~/src/service/mappers/formatters/shared.js'
import { createAndPopulatei18nInstance } from '~/src/service/notify.js'

const i18Instance = createAndPopulatei18nInstance(
  undefined,
  /** @type {FormDefinition} */ (
    /** @type {any} */ ({
      ...buildDefinition(),
      metadata: {
        cy: {
          dummy: 'dummy welsh text'
        }
      }
    })
  )
)
const translator = createTranslator(i18Instance, EN_GB)
const welshTranslator = createTranslator(i18Instance, 'cy')

describe('extractPaymentDetails', () => {
  const baseMessage = buildFormAdapterSubmissionMessage(
    /** @type {FormAdapterSubmissionMessage} */ ({
      data: {
        payment: {
          paymentId: 'pay_abc123',
          reference: 'REF-123-456',
          amount: 145.5,
          description: 'Application fee',
          descriptionInEng: 'Application fee',
          createdAt: '2025-11-10T17:01:29.000Z'
        }
      }
    })
  )

  it('should format amount and date/time', () => {
    const message = structuredClone(baseMessage)
    expect(extractPaymentDetails(message, translator)).toEqual({
      amount: '£145.50',
      description: 'Application fee',
      dateOfPayment: '5:01pm on 10 November 2025'
    })
  })

  it('should handle amount with zero pence', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 100
    // @ts-expect-error - will be defined for testing
    message.data.payment.createdAt = '2026-12-02T14:21:55.000Z'

    expect(extractPaymentDetails(message, translator)).toEqual({
      amount: '£100.00',
      description: 'Application fee',
      dateOfPayment: '2:21pm on 2 December 2026'
    })
  })

  it('should handle amount with thousand separator', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 123456.78

    expect(extractPaymentDetails(message, translator)).toEqual({
      amount: '£123,456.78',
      description: 'Application fee',
      dateOfPayment: '5:01pm on 10 November 2025'
    })
  })

  it('should handle Welsh', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 123456.78
    // @ts-expect-error - will be defined for testing
    message.data.payment.description = 'Welsh payment desc'

    expect(extractPaymentDetails(message, welshTranslator)).toEqual({
      amount: '£123,456.78',
      description: 'Welsh payment desc',
      dateOfPayment: '5:01pm ar 10 Tachwedd 2025'
    })
  })
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
