import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  FileStatus,
  UploadStatus
} from '@defra/forms-engine-plugin/engine/types/enums.js'
import { hasRepeater } from '@defra/forms-model'
import { addMonths } from 'date-fns'

import { config } from '~/src/config/index.js'
import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import { EmailContentCreator } from '~/src/service/mappers/formatters/email-content-creator.js'
import {
  calculateOrder,
  extractPaymentDetails,
  findRepeaterPageByKey,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField
} from '~/src/service/mappers/formatters/shared.js'

const designerUrl = config.get('designerUrl')

const fileExpiryInMonths = config.get('fileExpiryInMonths')

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
 * @param {FormDefinition} definition
 * @param {FormAdapterSubmissionMessage} message
 * @param {string[]} lines
 */
export function handleReferenceNumber(definition, message, lines) {
  if (definition.options?.showReferenceNumber) {
    lines.push(`^ Reference number: ${message.meta.referenceNumber}\n`)
  }
}

/**
 * Appends the payment details section to the email lines if payment exists
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {string[]} lines
 */
function appendPaymentSection(formSubmissionMessage, lines) {
  const paymentDetails = extractPaymentDetails(formSubmissionMessage)

  if (!paymentDetails) {
    return
  }

  lines.push(
    '# Payment details\n',
    '## Payment for\n',
    `${escapeContent(paymentDetails.description)}\n`,
    '## Total amount\n',
    `${paymentDetails.amount}\n`,
    '## Date of payment\n',
    `${escapeContent(paymentDetails.dateOfPayment)}\n`,
    '---\n'
  )
}

/**
 * Process repeater entries and add file links to the component map
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 */
function processRepeaterFiles(formSubmissionMessage, formDefinition) {
  const components = new Map()
  const repeaterEntries = Object.entries(
    formSubmissionMessage.result.files.repeaters
  )

  for (const [key, fileId] of repeaterEntries) {
    const repeaterPage = findRepeaterPageByKey(key, formDefinition)

    if (!hasRepeater(repeaterPage)) {
      continue
    }

    const label = escapeContent(repeaterPage.repeat.options.title)
    const componentKey = repeaterPage.repeat.options.name
    const questionLines = /** @type {string[]} */ ([])

    questionLines.push(`## ${label}\n`)

    const repeaterFilename = escapeFileLabel(`Download ${label} (CSV)`)
    questionLines.push(
      `[${repeaterFilename}](${designerUrl}/file-download/${fileId})\n`,
      '---\n'
    )
    components.set(componentKey, questionLines)
  }
  return components
}

/**
 * Append component lines to the output in the correct order
 * @param {string[]} order
 * @param {Map<string, string[]>} componentMap
 * @param {string[]} lines
 */
function appendComponentLines(order, componentMap, lines) {
  for (const key of order) {
    const componentLines = componentMap.get(key)

    if (componentLines) {
      lines.push(...componentLines)
    }
  }
}

/**
 * Human readable notify formatter v1
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {string} _schemaVersion
 */
export function formatter(
  formSubmissionMessage,
  formDefinition,
  _schemaVersion
) {
  const { meta, result } = formSubmissionMessage
  const { isPreview, status } = meta
  const files = result.files

  const formModel = new FormModel(formDefinition, { basePath: '' }, {})

  const formName = escapeContent(meta.formName)
  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${dateFormat(now, 'h:mmaaa')} on ${dateFormat(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addMonths(now, fileExpiryInMonths)
  const formattedExpiryDate = `${dateFormat(fileExpiryDate, 'h:mmaaa')} on ${dateFormat(fileExpiryDate, 'eeee d MMMM yyyy')}`

  const order = calculateOrder(formDefinition, formSubmissionMessage)
  /**
   * @type {string[]}
   */
  const lines = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${escapeContent(formattedExpiryDate)}\n`
  )

  if (isPreview) {
    lines.push(`This is a test of the ${formName} ${status} form.\n`)
  }

  lines.push(
    `${formName} form received at ${escapeContent(formattedNow)}.\n`,
    '---\n'
  )

  handleReferenceNumber(formDefinition, formSubmissionMessage, lines)

  const creator = new EmailContentCreator(
    fieldHandlers,
    formatListFormComponent,
    () => false,
    mapFormAdapterFileToFileState
  )

  const mainComponentsMap = creator.processMainEntries(
    formSubmissionMessage,
    formModel
  )
  const repeaterComponentsMap = creator.processRepeaterEntries(
    formSubmissionMessage,
    formDefinition,
    formModel
  )

  const componentMap = new Map([...mainComponentsMap, ...repeaterComponentsMap])

  appendComponentLines(order, componentMap, lines)

  const repeaterFilesMap = processRepeaterFiles(
    formSubmissionMessage,
    formDefinition
  )
  appendComponentLines(
    Array.from(repeaterFilesMap.keys()),
    repeaterFilesMap,
    lines
  )

  // Add payment details section if payment exists
  appendPaymentSection(formSubmissionMessage, lines)

  const mainResultFilename = escapeFileLabel('Download main form (CSV)')
  lines.push(
    `[${mainResultFilename}](${designerUrl}/file-download/${files.main})\n`,
    '\n',
    'Thanks,',
    'Defra'
  )

  return lines.join('\n')
}

/**
 * Format file upload field
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
 * Format list form component field
 * @param {string} answer
 * @param {Component} field
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
 *
 * @param {FormAdapterFile} file
 * @returns {FileState}
 */
function mapFormAdapterFileToFileState(file) {
  const status = /** @type {UploadStatusFileResponse} */ ({
    form: {
      file: {
        contentLength: 0,
        fileStatus: FileStatus.complete,
        fileId: file.fileId,
        filename: escapeFileLabel(file.fileName)
      }
    },
    uploadStatus: UploadStatus.ready,
    metadata: {
      retrievalKey: ''
    }
  })

  return {
    status,
    uploadId: 'f1ee2837-7581-4cb0-8113-134527250fee'
  }
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FileState, FormAdapterSubmissionMessage, FormAdapterFile, FormValue, FormStateValue, RichFormValue, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
