import { hasRepeater } from '@defra/forms-model'

import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent } from '~/src/lib/notify.js'
import { NOT_PROVIDED_TRANSLATION_KEY } from '~/src/service/constants.js'

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
 * Builds the component map key holding the answers of a repeater page.
 * The repeater name on its own is reserved for the repeater's CSV download link.
 * @param {string} repeaterName - the repeat.options.name of the repeater page
 * @returns {string}
 */
export function repeaterAnswersKey(repeaterName) {
  return `${repeaterName}__answers`
}

/**
 * Format multiline text field
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} _richFormValue
 * @param {FormAdapterSubmissionMessage} _formSubmissionMessage
 * @param {Translator} translator
 * @returns {string}
 */
export function formatMultilineTextField(
  answer,
  field,
  _richFormValue,
  _formSubmissionMessage,
  translator
) {
  if (!answer && !field.options?.required) {
    return `${translator.t(NOT_PROVIDED_TRANSLATION_KEY)}\n`
  }

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
 * @param {FormAdapterSubmissionMessage} _formSubmissionMessage
 * @param {Translator} translator
 * @returns {string}
 */
export function formatUkAddressField(
  _answer,
  field,
  richFormValue,
  _formSubmissionMessage,
  translator
) {
  // Format UK addresses into new lines
  const formField = /** @type {FormComponent} */ (field)
  const contextValue = formField.getContextValueFromFormValue(richFormValue)
  const optional = !field.options?.required
  if (optional && !contextValue) {
    return `${translator.t(NOT_PROVIDED_TRANSLATION_KEY)}\n`
  }
  return [contextValue ?? []]
    .flat()
    .map((v) => escapeContent(String(v)))
    .join('\n')
    .concat('\n')
}

/**
 * Format location coordinate fields (Easting/Northing or Lat/Long)
 * @param {string} _answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param { FormAdapterSubmissionMessage | undefined } _formSubmissionMessage
 * @param {Translator} translator
 * @returns {string}
 */
export function formatLocationField(
  _answer,
  field,
  richFormValue,
  _formSubmissionMessage,
  translator
) {
  const formField = /** @type {FormComponent} */ (field)
  const contextValue = formField.getDisplayStringFromFormValue(
    richFormValue,
    translator
  )
  const optional = !field.options?.required
  if (optional && contextValue === '') {
    return `${translator.t(NOT_PROVIDED_TRANSLATION_KEY)}\n`
  }
  return contextValue ? `${contextValue}\n` : ''
}

/**
 * Extracts payment details from the submission message if a payment exists.
 * Forms only have one payment component.
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {Translator} translator
 * @returns {{ description: string, amount: string, dateOfPayment: string } | undefined}
 */
export function extractPaymentDetails(formSubmissionMessage, translator) {
  const payment = formSubmissionMessage.data.payment

  if (!payment) {
    return undefined
  }

  const { language, t } = translator

  const date = new Date(payment.createdAt)
  const dateOfPayment = `${dateFormat(date, 'h:mmaaa')} ${t('confirmationEmail.on')} ${dateFormat(date, 'd MMMM yyyy', language)}`

  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  })
  const amountFormatted = formatter.format(payment.amount)
  const description =
    language === 'en-GB' ? payment.descriptionInEng : payment.description
  return {
    description:
      description && description !== '' ? description : payment.description,
    amount: amountFormatted,
    dateOfPayment
  }
}

/**
 * Format geospatial field
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param { FormAdapterSubmissionMessage | undefined } _formSubmissionMessage
 * @param {Translator} translator
 * @returns {string}
 */
export function formatGeospatialField(
  answer,
  field,
  richFormValue,
  _formSubmissionMessage,
  translator
) {
  const features = /** @type {GeospatialState} */ (richFormValue)

  const optional = !field.options?.required

  // Not provided
  if (!features.length && optional) {
    return `${translator.t(NOT_PROVIDED_TRANSLATION_KEY)}\n`
  }

  let answerEscaped = `${escapeContent(answer)}:\n\n`

  const value = features
    .map((feature) => {
      const { properties, geometry } = feature
      const { description, coordinateGridReference, centroidGridReference } =
        properties
      const { coordinates } = geometry
      const flattened = coordinates.flat(2)

      const points = []
      for (let i = 0; i < flattened.length; i += 2) {
        points.push(
          flattened
            .slice(i, i + 2)
            .reverse()
            .join(', ')
        )
      }

      // For polygons use the grid reference of the centroid
      const gridReference =
        feature.geometry.type === 'Polygon'
          ? centroidGridReference
          : coordinateGridReference

      const coordinatesHeading = 'Latitude, Longitude'

      return `${description}:\n${gridReference}\n${coordinatesHeading}\n${points.join('\n')}\n`
    })
    .join('\n')

  answerEscaped += value
  return answerEscaped
}

/**
 * Generates a link to designer to view a geospatial map
 * @param {string} referenceNumber
 * @param {string} pageId
 * @param {string} componentId
 * @param {string} designerUrl
 * @returns {string}
 */
export function generateGeospatialMapLink(
  referenceNumber,
  pageId,
  componentId,
  designerUrl
) {
  return `\n[View map](${designerUrl}/submission/${referenceNumber}/map-review/${pageId}/${componentId})\n`
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
 * @import { FormAdapterSubmissionMessage, GeospatialState, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 */
