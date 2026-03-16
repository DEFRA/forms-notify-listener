import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'

import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import { EmailContentCreator } from '~/src/service/mappers/formatters/email-content-creator.js'
import {
  calculateOrder,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField
} from '~/src/service/mappers/formatters/shared.js'

/**
 * Check if a field should be skipped (no value provided)
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param {string} answer
 * @returns {boolean}
 */
function shouldSkipField(field, richFormValue, answer) {
  if (!field) {
    return true
  }

  const isRequired = field.options?.required ?? true

  if (isRequired) {
    return false // Never skip a required field
  }

  // Also skip if optional and the display string is empty
  if (!isRequired && answer === '') {
    return true
  }

  const hasNoValue = richFormValue === null || richFormValue === undefined

  // For file uploads, check if array is empty
  const isEmptyFileUpload =
    field instanceof FileUploadField &&
    Array.isArray(richFormValue) &&
    richFormValue.length === 0

  return hasNoValue || isEmptyFileUpload
}

/**
 * Assemble output lines in the correct order
 * @param {string[]} order
 * @param {Map<string, string[]>} componentMap
 * @returns {string}
 */
function assembleOutput(order, componentMap) {
  /** @type {string[]} */
  const lines = []

  for (const key of order) {
    const componentLines = componentMap.get(key)

    if (componentLines) {
      lines.push(...componentLines)
    }
  }

  return lines.join('\n').trim()
}

/**
 * Map of component types to their formatting handlers
 */
const fieldHandlers = new Map([
  [Components.FileUploadField, formatFileUploadField],
  [Components.MultilineTextField, formatMultilineTextField],
  [Components.UkAddressField, formatUkAddressField],
  [Components.EastingNorthingField, formatLocationField],
  [Components.LatLongField, formatLocationField]
])

/**
 * User answers formatter for confirmation emails
 * Generates Markdown output of questions with answers for the form submitter
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @returns {string}
 */
export function formatter(formSubmissionMessage, formDefinition) {
  const formModel = new FormModel(formDefinition, { basePath: '' }, {})
  const order = calculateOrder(formDefinition, formSubmissionMessage)

  // Process main entries and repeater entries
  const creator = new EmailContentCreator(
    fieldHandlers,
    formatListFormComponent,
    shouldSkipField,
    undefined
  )
  const mainComponents = creator.processMainEntries(
    formSubmissionMessage,
    formModel
  )
  const repeaterComponents = creator.processRepeaterEntries(
    formSubmissionMessage,
    formDefinition,
    formModel
  )

  // Merge component maps
  const componentMap = new Map([...mainComponents, ...repeaterComponents])

  return assembleOutput(order, componentMap)
}

/**
 * Format file upload field - shows only file names (no links for user emails)
 * @param {string} answer
 * @param {Component} _field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function formatFileUploadField(answer, _field, richFormValue) {
  const formAdapterFiles = /** @type {FormAdapterFile[]} */ (richFormValue)

  // Skip empty files
  if (!formAdapterFiles.length) {
    return `${escapeContent(answer)}\n`
  }

  // Single file: no bullet point
  if (formAdapterFiles.length === 1) {
    return `${escapeFileLabel(formAdapterFiles[0].fileName)}\n`
  }

  // Just list file names with bullet points
  const fileList = formAdapterFiles
    .map((file) => {
      const filename = escapeFileLabel(file.fileName)
      return `* ${filename}\n`
    })
    .join('')

  return fileList
}

/**
 * Format list form component field (radio, checkbox, select)
 * Uses bullet points only for multiple answers, plain text for single answers
 * @param {string} _answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function formatListFormComponent(_answer, field, richFormValue) {
  const values = new Set(
    [field.getContextValueFromFormValue(richFormValue)].flat()
  )
  const items = field.items.filter((/** @type {{ value: any }} */ { value }) =>
    values.has(value)
  )

  // Skip empty values
  if (!items.length) {
    return ''
  }

  // Single answer: no bullet point
  if (items.length === 1) {
    return `${escapeContent(items[0].text)}\n`
  }

  // Multiple answers: use bullet points
  const formattedItems = items
    .map((/** @type {any} */ item) => {
      const label = escapeContent(item.text)
      return `* ${label}\n`
    })
    .join('')

  return formattedItems
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
