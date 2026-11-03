import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'
import { buildDefinition } from '@defra/forms-model/stubs'

import { EN_GB } from '~/src/i18n/translations-helper.js'
import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import {
  detailsIfCopyAction,
  extractPaymentDetails,
  getFormAction,
  isAllowCopyEnabled
} from '~/src/service/mappers/formatters/shared.js'
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

describe('isAllowCopyEnabled', () => {
  /**
   * @param {unknown} options
   */
  const buildFormDefinitionWithOptions = (options) => {
    const formDefinition = buildDefinition()
    Object.assign(formDefinition, { metadata: { options } })
    return formDefinition
  }

  it('should return true when copying answers is enabled', () => {
    expect(
      isAllowCopyEnabled(buildFormDefinitionWithOptions({ allowCopy: true }))
    ).toBe(true)
  })

  it.each([
    undefined,
    null,
    'invalid',
    {},
    { allowCopy: false },
    { allowCopy: 'true' }
  ])('should return false when copy is not enabled (%p)', (options) => {
    expect(isAllowCopyEnabled(buildFormDefinitionWithOptions(options))).toBe(
      false
    )
  })

  it('should return false when options are absent', () => {
    expect(isAllowCopyEnabled(buildDefinition())).toBe(false)
  })
})

describe('detailsIfCopyAction', () => {
  const formDefinition = buildDefinition()
  Object.assign(formDefinition, {
    metadata: { options: { allowCopy: true } }
  })

  /**
   * @param {string} actionName
   * @param {string} actionReferenceNumber
   */
  const buildMessageWithAction = (actionName, actionReferenceNumber) => {
    const message = buildFormAdapterSubmissionMessage()
    Object.assign(message.meta, {
      custom: { actionName, actionReferenceNumber }
    })
    return message
  }

  it('should return copy details when copying is enabled', () => {
    expect(
      detailsIfCopyAction(
        formDefinition,
        buildMessageWithAction('copy', '123-456-789')
      )
    ).toEqual({
      isCopy: true,
      actionReferenceNumber: '123-456-789'
    })
  })

  it('should not return copy details when copying is disabled', () => {
    const disabledFormDefinition = buildDefinition()
    const message = buildMessageWithAction('copy', '123-456-789')

    expect(detailsIfCopyAction(disabledFormDefinition, message)).toEqual({
      isCopy: false,
      actionReferenceNumber: undefined
    })
  })

  it('should not return copy details for a different action', () => {
    expect(
      detailsIfCopyAction(
        formDefinition,
        buildMessageWithAction('another-action', '123-456-789')
      )
    ).toEqual({
      isCopy: false,
      actionReferenceNumber: undefined
    })
  })

  it('should not return copy details when the message has no custom action', () => {
    expect(
      detailsIfCopyAction(formDefinition, buildFormAdapterSubmissionMessage())
    ).toEqual({
      isCopy: false,
      actionReferenceNumber: undefined
    })
  })
})

describe('getFormAction', () => {
  it('should return the copy action when copying is enabled', () => {
    const formDefinition = buildDefinition()
    Object.assign(formDefinition, {
      metadata: { options: { allowCopy: true } }
    })
    const message = buildFormAdapterSubmissionMessage()
    Object.assign(message.meta, {
      custom: {
        actionName: 'copy',
        actionReferenceNumber: '123-456-789'
      }
    })

    expect(getFormAction(message, formDefinition)).toEqual({
      name: 'copy',
      referenceNumber: '123-456-789'
    })
  })

  it('should return undefined when the message is not a copy action', () => {
    expect(
      getFormAction(buildFormAdapterSubmissionMessage(), buildDefinition())
    ).toBeUndefined()
  })
})

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
