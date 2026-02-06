import { extractPaymentDetails } from '~/src/service/mappers/formatters/shared.js'

describe('extractPaymentDetails', () => {
  const baseMessage = /** @type {FormAdapterSubmissionMessage} */ ({
    data: {
      payment: {
        paymentId: 'payment-id',
        reference: 'ABC-DEF-123',
        amount: 17.5,
        description: 'Pay for a licence',
        createdAt: '2026-05-02T09:21:55'
      }
    }
  })
  it('should format amount and date/time', () => {
    const message = structuredClone(baseMessage)
    expect(extractPaymentDetails(message)).toEqual({
      amount: '£17.50',
      description: 'Pay for a licence',
      dateOfPayment: '9:21am on 2 May 2026'
    })
  })

  it('should handle amount with zero pence', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 100
    // @ts-expect-error - will be defined for testing
    message.data.payment.createdAt = '2026-05-12T14:21:55'

    expect(extractPaymentDetails(message)).toEqual({
      amount: '£100.00',
      description: 'Pay for a licence',
      dateOfPayment: '2:21pm on 12 May 2026'
    })
  })

  it('should handle amount with thousand separator', () => {
    const message = structuredClone(baseMessage)
    // @ts-expect-error - will be defined for testing
    message.data.payment.amount = 123456.78

    expect(extractPaymentDetails(message)).toEqual({
      amount: '£123,456.78',
      description: 'Pay for a licence',
      dateOfPayment: '9:21am on 2 May 2026'
    })
  })
})

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
