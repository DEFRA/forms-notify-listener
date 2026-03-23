import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  FileStatus,
  UploadStatus
} from '@defra/forms-engine-plugin/engine/types/enums.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'
import { addMonths } from 'date-fns'

import { config } from '~/src/config/index.js'
import { format as dateFormat } from '~/src/helpers/date.js'
import { stringHasNonEmptyValue } from '~/src/helpers/string-utils.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import {
  appendComponentLines,
  extractPaymentDetails,
  findRepeaterPageByKey,
  formatFileUploadFieldInternal,
  formatListFormComponentInternal,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField,
  getRelevantPagesForLegacy
} from '~/src/service/mappers/formatters/shared.js'

const designerUrl = config.get('designerUrl')

const fileExpiryInMonths = config.get('fileExpiryInMonths')

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
 * Process main form entries and add them to the component map
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormModel} formModel
 * @param {Map<string, string[]>} componentMap
 */
function processMainEntries(formSubmissionMessage, formModel, componentMap) {
  const mainEntries = Object.entries({
    ...formSubmissionMessage.data.main,
    ...formSubmissionMessage.data.files
  })

  for (const [key, richFormValue] of mainEntries) {
    const questionLines = /** @type {string[]} */ ([])
    const field = formModel.componentMap.get(key)

    let mappedRichFormValue = richFormValue

    if (field instanceof FileUploadField) {
      mappedRichFormValue = richFormValue.map(mapFormAdapterFileToFileState)
    }

    const answer = field.getDisplayStringFromFormValue(mappedRichFormValue)

    const label = escapeContent(field.title)
    questionLines.push(`## ${label}\n`)

    if (richFormValue !== null || stringHasNonEmptyValue(answer)) {
      const answerLine = generateFieldLine(answer, field, richFormValue)
      questionLines.push(answerLine)
    }

    questionLines.push('---\n')
    componentMap.set(key, questionLines)
  }
}

/**
 * Process repeater entries and add them to the component map
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {Map<string, string[]>} componentMap
 */
function processRepeaterEntries(
  formSubmissionMessage,
  formDefinition,
  componentMap
) {
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
    componentMap.set(componentKey, questionLines)
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
  const componentMap = new Map()
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

  processMainEntries(formSubmissionMessage, formModel, componentMap)
  processRepeaterEntries(formSubmissionMessage, formDefinition, componentMap)
  appendComponentLines(order, componentMap, lines)

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
 * Map of component types to their formatting handlers
 * Using Map to preserve class constructor references
 */
const fieldHandlers = new Map([
  [Components.FileUploadField, formatFileUploadFieldInternal],
  [Components.MultilineTextField, formatMultilineTextField],
  [Components.UkAddressField, formatUkAddressField],
  [Components.EastingNorthingField, formatLocationField],
  [Components.LatLongField, formatLocationField]
])

/**
 * Check if field is a list component and return appropriate handler
 * @param {Component} field
 * @returns {((answer: string, field: Component, richFormValue: RichFormValue) => string) | null}
 */
function getListComponentHandler(field) {
  if (field instanceof ListFormComponent && field instanceof FormComponent) {
    return formatListFormComponentInternal
  }
  return null
}

/**
 *
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function generateFieldLine(answer, field, richFormValue) {
  // Check list component first (special case with multiple inheritance)
  const listHandler = getListComponentHandler(field)
  if (listHandler) {
    return listHandler(answer, field, richFormValue)
  }

  // Iterate through registered handlers
  for (const [Type, handler] of fieldHandlers) {
    if (field instanceof Type) {
      return handler(answer, field, richFormValue)
    }
  }

  // Default handler for all other field types
  return `${escapeContent(answer)}\n`
}

/**
 * Calculate the order of components for human readable output
 * @param {FormDefinition} formDefinition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string[]}
 */
function calculateOrder(formDefinition, formSubmissionMessage) {
  if (formDefinition.engine === Engine.V1) {
    return getRelevantPagesForLegacy(formDefinition, formSubmissionMessage)
  }

  return formDefinition.pages.flatMap((page) => {
    if (hasComponents(page)) {
      if (hasRepeater(page)) {
        return [page.repeat.options.name]
      }
      return page.components.map((component) => component.name)
    }
    return []
  })
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
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue, FormValue, FormStateValue, FileState, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
