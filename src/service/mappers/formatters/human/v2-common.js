import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'

import { config } from '~/src/config/index.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import {
  formatGeospatialField as sharedFormatGeospatialField,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField,
  generateGeospatialMapLink
} from '~/src/service/mappers/formatters/shared.js'

const designerUrl = config.get('designerUrl')

/**
 * Map of component types to their formatting handlers
 * Using Map to preserve class constructor references
 * @type {Map<new (...args: any[]) => Component, (answer: string, field: Component, richFormValue: RichFormValue, formSubmissionMessage: FormAdapterSubmissionMessage) => string>}
 */
const fieldHandlers = new Map()
fieldHandlers.set(Components.FileUploadField, formatFileUploadField)
fieldHandlers.set(Components.MultilineTextField, formatMultilineTextField)
fieldHandlers.set(Components.UkAddressField, formatUkAddressField)
fieldHandlers.set(Components.EastingNorthingField, formatLocationField)
fieldHandlers.set(Components.LatLongField, formatLocationField)
fieldHandlers.set(Components.GeospatialField, formatGeospatialField)

/**
 *
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string}
 */
export function generateFieldLine(
  answer,
  field,
  richFormValue,
  formSubmissionMessage
) {
  // Check list component first (special case with multiple inheriance)
  if (field instanceof ListFormComponent && field instanceof FormComponent) {
    return formatListFormComponent(answer, field, richFormValue)
  }

  // Iterate through registered handlers
  for (const [Type, handler] of fieldHandlers) {
    if (field instanceof Type) {
      return handler(answer, field, richFormValue, formSubmissionMessage)
    }
  }

  // Default handler for all other field types
  return `${escapeContent(answer)}\n`
}

/**
 * Format list form component field
 * @param {string} answer
 * @param {ListFormComponent} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function formatListFormComponent(answer, field, richFormValue) {
  const values = new Set(
    [field.getContextValueFromFormValue(richFormValue)].flat()
  )
  const items = field.items.filter((/** @type {{ value: any }} */ { value }) =>
    values.has(value)
  )

  // Skip empty values
  if (!items.length) {
    return `${escapeContent(answer)}\n`
  }

  const formattedItems = items
    .map((/** @type {any} */ item) => {
      const label = escapeContent(item.text)
      const value = escapeContent(`(${item.value})`)

      let line = label

      // Prepend bullet points for checkboxes only
      if (field instanceof Components.CheckboxesField) {
        line = `* ${line}`
      }

      // Append raw values in parentheses
      // e.g. `* None of the above (false)`
      return `${item.value}`.toLowerCase() === item.text.toLowerCase()
        ? `${line}\n`
        : `${line} ${value}\n`
    })
    .join('')

  return formattedItems
}

/**
 * Format geospatial field
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string}
 */
function formatGeospatialField(
  answer,
  field,
  richFormValue,
  formSubmissionMessage
) {
  let answerLine = sharedFormatGeospatialField(answer, field, richFormValue)

  const pageId = field.page?.id
  const componentId = field.id

  if (pageId && componentId) {
    const referenceNumber = formSubmissionMessage.meta.referenceNumber
    const link = generateGeospatialMapLink(
      referenceNumber,
      pageId,
      componentId,
      designerUrl
    )
    answerLine += link
  }

  return answerLine
}

/**
 * Format file upload field
 * @param {string} answer
 * @param {Component} _field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function formatFileUploadField(answer, _field, richFormValue) {
  const formAdapterFiles = /** @type {FormAdapterFile[]} */ (
    /** @type {unknown} */ (richFormValue)
  )

  // Skip empty files
  if (!formAdapterFiles.length) {
    return `${escapeContent(answer)}\n`
  }

  let answerEscaped = `${escapeContent(answer)}:\n\n`

  const fileUploadString = formAdapterFiles
    .map((file) => {
      const fileUploadFilename = escapeFileLabel(file.fileName)
      return `* [${fileUploadFilename}](${designerUrl}/file-download/${file.fileId})\n`
    })
    .join('')

  answerEscaped += fileUploadString
  return answerEscaped
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 */
