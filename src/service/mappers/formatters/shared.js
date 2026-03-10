import { getGridRef } from '@defra/forms-engine-plugin/engine/components/helpers/gridref.js'
import { hasRepeater } from '@defra/forms-model'

import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent } from '~/src/lib/notify.js'

/**
 * Finds a repeater page by its key (repeat.options.name)
 * @param {string} key
 * @param {FormDefinition} formDefinition
 */
export function findRepeaterPageByKey(key, formDefinition) {
  return formDefinition.pages.find((page) => {
    return hasRepeater(page) && page.repeat.options.name === key
  })
}

/**
 * Format multiline text field
 * @param {string} answer
 * @param {Component} _field
 * @param {RichFormValue} _richFormValue
 * @returns {string}
 */
export function formatMultilineTextField(answer, _field, _richFormValue) {
  // Preserve Multiline text new lines
  return answer
    .split(/(?:\r?\n)+/)
    .map(escapeContent)
    .join('\n')
    .concat('\n')
}

/**
 * Format UK address field
 * @param {string} _answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
export function formatUkAddressField(_answer, field, richFormValue) {
  // Format UK addresses into new lines
  return (field.getContextValueFromFormValue(richFormValue) ?? [])
    .map(escapeContent)
    .join('\n')
    .concat('\n')
}

/**
 * Format location coordinate fields (Easting/Northing or Lat/Long)
 * @param {string} _answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
export function formatLocationField(_answer, field, richFormValue) {
  const contextValue = field.getContextValueFromFormValue(richFormValue)
  return contextValue ? `${contextValue}\n` : ''
}

/**
 * Extracts payment details from the submission message if a payment exists.
 * Forms only have one payment component.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {{ description: string, amount: string, dateOfPayment: string } | undefined}
 */
export function extractPaymentDetails(formSubmissionMessage) {
  const payment = formSubmissionMessage.data.payment

  if (!payment) {
    return undefined
  }

  const date = new Date(payment.createdAt)
  const dateOfPayment = `${dateFormat(date, 'h:mmaaa')} on ${dateFormat(date, 'd MMMM yyyy')}`

  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  })
  const amountFormatted = formatter.format(payment.amount)
  return {
    description: payment.description,
    amount: amountFormatted,
    dateOfPayment
  }
}

/**
 * Format geospatial field
 * @param {string} answer
 * @param {Component} _field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
export function formatGeospatialField(answer, _field, richFormValue) {
  const features = /** @type {GeospatialState} */ (richFormValue)

  // Skip empty
  if (!features.length) {
    return `${escapeContent(answer)}\n`
  }

  let answerEscaped = `${escapeContent(answer)}:\n\n`

  const value = features
    .map((feature) => {
      const { properties, geometry } = feature
      const { description } = properties
      const { coordinates } = geometry
      const flattened = coordinates.flat(2)

      const points = []
      for (let i = 0; i < flattened.length; i += 2) {
        points.push(flattened.slice(i, i + 2).join(', '))
      }

      return `${description}:\n${getGridRef(feature)}\n${points.join('\n')}\n`
    })
    .join('\n')

  answerEscaped += value
  return answerEscaped
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormAdapterSubmissionMessage, GeospatialState, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
