import { RepeatPageController } from '@defra/forms-engine-plugin/controllers/RepeatPageController.js'
import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  FileStatus,
  UploadStatus
} from '@defra/forms-engine-plugin/engine/types/enums.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'
import { addDays } from 'date-fns'

import { config } from '~/src/config/index.js'
import { format as dateFormat } from '~/src/helpers/date.js'
import { stringHasNonEmptyValue } from '~/src/helpers/string-utils.js'

const designerUrl = config.get('designerUrl')

const FILE_EXPIRY_OFFSET = 90

/**
 *
 * @param {string} key
 * @param {FormDefinition} formDefinition
 */
function findRepeaterPageByKey(key, formDefinition) {
  return formDefinition.pages.find((page) => {
    return hasRepeater(page) && page.repeat.options.name === key
  })
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

  const formName = escapeMarkdown(meta.formName)
  /**
   * @todo Refactor this below but the code to
   * generate the question and answers works for now
   */
  const now = new Date()
  const formattedNow = `${dateFormat(now, 'h:mmaaa')} on ${dateFormat(now, 'd MMMM yyyy')}`

  const fileExpiryDate = addDays(now, FILE_EXPIRY_OFFSET)
  const formattedExpiryDate = `${dateFormat(fileExpiryDate, 'h:mmaaa')} on ${dateFormat(fileExpiryDate, 'eeee d MMMM yyyy')}`

  const order = calculateOrder(formDefinition, formSubmissionMessage)
  const componentMap = new Map()
  /**
   * @type {string[]}
   */
  const lines = []

  lines.push(
    `^ For security reasons, the links in this email expire at ${escapeMarkdown(formattedExpiryDate)}\n`
  )

  if (isPreview) {
    lines.push(`This is a test of the ${formName} ${status} form.\n`)
  }

  lines.push(
    `${formName} form received at ${escapeMarkdown(formattedNow)}.\n`,
    '---\n'
  )

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

    const label = escapeMarkdown(field.title)
    questionLines.push(`## ${label}\n`)

    if (richFormValue !== null || stringHasNonEmptyValue(answer)) {
      const answerLine = generateFieldLine(answer, field, richFormValue)
      questionLines.push(answerLine)
    }

    questionLines.push('---\n')
    componentMap.set(key, questionLines)
  }

  const repeaterEntries = Object.entries(
    formSubmissionMessage.result.files.repeaters
  )

  for (const [key, fileId] of repeaterEntries) {
    const repeaterPage = findRepeaterPageByKey(key, formDefinition)

    const questionLines = /**  @type {string[]}  */ ([])

    if (hasRepeater(repeaterPage)) {
      const label = escapeMarkdown(repeaterPage.repeat.options.title)
      const componentKey = repeaterPage.repeat.options.name

      questionLines.push(`## ${label}\n`)

      const repeaterFilename = escapeMarkdown(`Download ${label} (CSV)`)
      questionLines.push(
        `[${repeaterFilename}](${designerUrl}/file-download/${fileId})\n`,
        '---\n'
      )
      componentMap.set(componentKey, questionLines)
    }
  }

  for (const key of order) {
    const componentLines = componentMap.get(key)

    if (componentLines) {
      lines.push(...componentLines)
    }
  }

  const mainResultFilename = escapeMarkdown('Download main form (CSV)')
  lines.push(
    `[${mainResultFilename}](${designerUrl}/file-download/${files.main})\n`
  )

  lines.push('\n', 'Thanks,', 'Defra')

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
    return `${escapeMarkdown(answer)}\n`
  }

  let answerEscaped = `${escapeMarkdown(answer)}:\n\n`

  const fileUploadString = formAdapterFiles
    .map((file) => {
      const fileUploadFilename = escapeMarkdown(file.fileName)
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
    return `${escapeMarkdown(answer)}\n`
  }

  const formattedItems = items
    .map((/** @type {any} */ item) => {
      const label = escapeMarkdown(item.text)
      const value = escapeMarkdown(`(${item.value})`)

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
 * Format multiline text field
 * @param {string} answer
 * @param {Component} _field
 * @param {RichFormValue} _richFormValue
 * @returns {string}
 */
function formatMultilineTextField(answer, _field, _richFormValue) {
  // Preserve Multiline text new lines
  return answer
    .split(/(?:\r?\n)+/)
    .map(escapeMarkdown)
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
function formatUkAddressField(_answer, field, richFormValue) {
  // Format UK addresses into new lines
  return (field.getContextValueFromFormValue(richFormValue) ?? [])
    .map(escapeMarkdown)
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
function formatLocationField(_answer, field, richFormValue) {
  const contextValue = field.getContextValueFromFormValue(richFormValue)
  return contextValue ? `${contextValue}\n` : ''
}

/**
 * Map of component types to their formatting handlers
 * Using Map to preserve class constructor references
 */
const fieldHandlers = new Map([
  [Components.FileUploadField, formatFileUploadField],
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
    return formatListFormComponent
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
  return `${escapeMarkdown(answer)}\n`
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
 * @param {[string, FormValue|null]} entry
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
        filename: file.fileName
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
  const main = mainEntries.reduce(handleSubfields, {})

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)
  const repeaters = repeaterEntries.reduce((repeaterObject, [key, value]) => {
    const values = value.map((repeater, idx) => {
      const idxStr = `${idx}`
      return {
        ...Object.entries(repeater).reduce(handleSubfields, {}),
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
    {
      query: {
        force: true
      },
      params: {
        path: 'summary'
      }
    },
    state
  )

  const { relevantPages } = context
  const typedRelevantPages = /** @type {PageControllerClass[]} */ (
    relevantPages
  )

  return typedRelevantPages.reduce((order, page) => {
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
  }, [])
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { PageControllerClass } from '@defra/forms-engine-plugin/engine/pageControllers/helpers/pages.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue, FormValue, FormStateValue, FileState, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
