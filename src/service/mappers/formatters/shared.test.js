import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import {
  legacyGraphFormDefinition,
  legacyGraphFormMessage
} from '~/src/service/mappers/formatters/__stubs__/legacy-form.js'
import {
  extractPaymentDetails,
  getRelevantPagesForLegacy,
  mapValueToState
} from '~/src/service/mappers/formatters/shared.js'

describe('shared', () => {
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

  describe('mapValueToState', () => {
    it('should map adaptor v2 message to state', () => {
      const message = {
        ...legacyGraphFormMessage,
        data: {
          ...legacyGraphFormMessage.data,
          main: {
            ...legacyGraphFormMessage.data.main,
            dateComponent: {
              day: 1,
              month: 1,
              year: 2020
            }
          }
        }
      }
      expect(mapValueToState(message)).toEqual({
        $$__referenceNumber: 'REFERENCE_NUMBER',
        BuYlIg: 'John',
        zFwSsz: 'Doe',
        RRApmV: 'GB-ENG',
        CsWVsY: 4,
        VFhEJu: '23423',
        wqTVdv: 543,
        wGNLPw: [
          {
            IrwAyV: 'Jane',
            MWVjbY: 'Doe',
            dImeLi__month: 1,
            dImeLi__year: 2000,
            itemId: 'a581accd-e989-4500-87da-f3929c192db0'
          },
          {
            IrwAyV: 'Janet',
            MWVjbY: 'Doe',
            dImeLi__month: 1,
            dImeLi__year: 2000,
            itemId: 'a581accd-e989-4500-87da-f3929c192db1'
          }
        ],
        dateComponent__day: 1,
        dateComponent__month: 1,
        dateComponent__year: 2020,
        fileUploadComponent: [
          {
            uploadId: 'f1ee2837-7581-4cb0-8113-134527250fee',
            status: {
              uploadStatus: 'ready',
              metadata: {
                retrievalKey: ''
              },
              form: {
                file: {
                  fileId: '2c39f4bf-2ccc-4b73-8e0e-c91549b56989',
                  filename: 'bank_statement.pdf',
                  fileStatus: 'complete',
                  contentLength: 0
                }
              }
            }
          }
        ]
      })
    })
  })

  describe('getRelevantPagesForLegacy', () => {
    it('should get Relevant Pages For Legacy', () => {
      const pages = getRelevantPagesForLegacy(
        legacyGraphFormDefinition,
        legacyGraphFormMessage
      )
      const proofOfAddress = 'fileUploadComponent'
      const yourAge = 'CsWVsY'
      const countryOfBirth = 'RRApmV'
      const passportNumber = 'VFhEJu'

      const numberOfPeople = 'wqTVdv'
      const firstName = 'BuYlIg'
      const lastName = 'zFwSsz'
      const person = 'wGNLPw'

      expect(pages).toEqual([
        yourAge,
        countryOfBirth,
        firstName,
        lastName,
        person,
        passportNumber,
        numberOfPeople,
        proofOfAddress
      ])
    })
  })
})

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
