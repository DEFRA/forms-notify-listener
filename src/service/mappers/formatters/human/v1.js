import { RepeatPageController } from '@defra/forms-engine-plugin/controllers/RepeatPageController.js'
import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  FileStatus,
  UploadStatus
} from '@defra/forms-engine-plugin/engine/types/enums.js'
import {
  ComponentType,
  Engine,
  hasComponents,
  hasRepeater
} from '@defra/forms-model'
import { addMonths } from 'date-fns'

import { config } from '~/src/config/index.js'
import { format as dateFormat } from '~/src/helpers/date.js'
import { stringHasNonEmptyValue } from '~/src/helpers/string-utils.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import {
  extractPaymentDetails,
  findRepeaterPageByKey,
  formatGeospatialField as sharedFormatGeospatialField,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField,
  generateGeospatialMapLink
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

    if (!(field instanceof FormComponent)) {
      continue
    }

    let mappedRichFormValue = richFormValue

    if (field instanceof FileUploadField && richFormValue !== null) {
      mappedRichFormValue = /** @type {FormAdapterFile[]} */ (
        /** @type {unknown} */ (richFormValue)
      ).map(mapFormAdapterFileToFileState)
    }

    const answer = field.getDisplayStringFromFormValue(
      /** @type {any} */ (mappedRichFormValue)
    )

    const label = escapeContent(field.title)
    questionLines.push(`## ${label}\n`)

    if (richFormValue !== null || stringHasNonEmptyValue(answer)) {
      const answerLine = generateFieldLine(
        answer,
        field,
        /** @type {RichFormValue} */ (/** @type {unknown} */ (richFormValue)),
        formSubmissionMessage
      )
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
function processRepeaterFiles(
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
      `[${repeaterFilename}](${designerUrl}/file-download/${fileId})\n`
    )

    const geospatialRepeaterComponents = repeaterPage.components.filter(
      (component) => component.type === ComponentType.GeospatialField
    )
    const pageId = repeaterPage.id

    if (pageId && geospatialRepeaterComponents.length) {
      questionLines.push(
        ...geospatialRepeaterComponents
          .map((component) =>
            component.id
              ? generateGeospatialMapLink(
                  formSubmissionMessage.meta.referenceNumber,
                  pageId,
                  component.id,
                  designerUrl
                )
              : ''
          )
          .filter((link) => link !== '')
      )
    }

    questionLines.push('---\n')

    componentMap.set(componentKey, questionLines)
  }
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

  const formModel = new FormModel(
    formDefinition,
    { basePath: '' },
    /** @type {any} */ ({})
  )

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
  processRepeaterFiles(formSubmissionMessage, formDefinition, componentMap)
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

  if (
    pageId &&
    componentId &&
    Array.isArray(richFormValue) &&
    richFormValue.length > 0
  ) {
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
function generateFieldLine(
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
 * @param {Record<string, FormStateValue>} subfieldObject
 * @param {[string, RichFormValue|null]} entry
 * @returns {Record<string, FormStateValue>}
 */
function handleSubfields(subfieldObject, [key, value]) {
  if (typeof value === 'object' && value !== null) {
    const subValues = Object.entries(value).reduce((acc2, [key2, value2]) => {
      if (value2 === undefined) {
        return acc2
      }
      return {
        ...acc2,
        [`${key}__${key2}`]: value2
      }
    }, {})

    return {
      ...subfieldObject,
      ...subValues
    }
  }

  if (value === undefined) {
    return subfieldObject
  }

  return {
    ...subfieldObject,
    [key]: value
  }
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
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 */
export function mapValueToState(formSubmissionMessage) {
  const mainEntries = Object.entries(formSubmissionMessage.data.main)
  const main = mainEntries.reduce(
    (acc, entry) => handleSubfields(acc, entry),
    /** @type {Record<string, FormStateValue>} */ ({})
  )

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)
  const repeaters = repeaterEntries.reduce((repeaterObject, [key, value]) => {
    const values = value.map((repeater, idx) => {
      const idxStr = `${idx}`
      const subfields = Object.entries(repeater).reduce(
        (acc, entry) => handleSubfields(acc, entry),
        /** @type {Record<string, FormStateValue>} */ ({})
      )
      return {
        ...subfields,
        itemId:
          `a581accd-e989-4500-87da-f3929c192dba`.slice(0, 0 - idxStr.length) +
          idxStr
      }
    })

    return {
      ...repeaterObject,
      [key]: values
    }
  }, {})

  const fileEntries = Object.entries(formSubmissionMessage.data.files)
  const files = fileEntries.reduce((fileObject, [key, value]) => {
    const componentFiles = value.map(mapFormAdapterFileToFileState)
    return {
      ...fileObject,
      [key]: componentFiles
    }
  }, {})

  return {
    $$__referenceNumber: 'REFERENCE_NUMBER',
    ...main,
    ...repeaters,
    ...files
  }
}

/**
 *
 * @param {FormDefinition} formDefinition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 */
export function getRelevantPagesForLegacy(
  formDefinition,
  formSubmissionMessage
) {
  const model = new FormModel(formDefinition, { basePath: '' })
  const state = mapValueToState(formSubmissionMessage)

  const context = model.getFormContext(
    /** @type {FormContextRequest} */ ({
      query: {
        force: 'true'
      },
      params: {
        path: 'summary',
        slug: ''
      }
    }),
    state
  )

  const { relevantPages } = context
  const typedRelevantPages = /** @type {PageControllerClass[]} */ (
    relevantPages
  )

  return typedRelevantPages.reduce(
    /** @type {(order: string[], page: PageControllerClass) => string[]} */ (
      (order, page) => {
        const { collection } = page

        if (page instanceof RepeatPageController) {
          return [...order, page.repeat.options.name]
        } else {
          return [
            ...order,
            ...collection.fields.map(
              /** @type {(f: Component) => string} */ ((f) => f.name)
            )
          ]
        }
      }
    ),
    /** @type {string[]} */ ([])
  )
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { PageControllerClass } from '@defra/forms-engine-plugin/engine/pageControllers/helpers/pages.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue, FormStateValue, FileState, FormContextRequest, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
