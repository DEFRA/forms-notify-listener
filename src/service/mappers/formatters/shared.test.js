import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import { extractPaymentDetails } from '~/src/service/mappers/formatters/shared.js'

describe('extractPaymentDetails', () => {
  const baseMessage = buildFormAdapterSubmissionMessage(
    /** @type {FormAdapterSubmissionMessage} */ ({
      data: {
        payment: {
          paymentId: 'pay_abc123',
          reference: 'REF-123-456',
          amount: 145.5,
          description: 'Application fee',
          createdAt: '2025-11-10T17:01:29.000Z'
        }
      }
    })
  )

  it('should format amount and date/time', () => {
    const message = structuredClone(baseMessage)
    expect(extractPaymentDetails(message)).toEqual({
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

    expect(extractPaymentDetails(message)).toEqual({
      amount: '£100.00',
      description: 'Application fee',
      dateOfPayment: '2:21pm on 2 December 2026'
    })
  })

  it('should handle amount with thousand separator', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 123456.78

    expect(extractPaymentDetails(message)).toEqual({
      amount: '£123,456.78',
      description: 'Application fee',
      dateOfPayment: '5:01pm on 10 November 2025'
    })
  })
})

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
