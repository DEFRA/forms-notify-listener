import { RepeatPageController } from '@defra/forms-engine-plugin/controllers/RepeatPageController.js'
import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
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
import { generateFieldLine } from '~/src/service/mappers/formatters/human/v2-common.js'
import {
  processRepeaterEntries,
  processRepeaterFiles
} from '~/src/service/mappers/formatters/human/v2-repeater.js'
import { extractPaymentDetails } from '~/src/service/mappers/formatters/shared.js'

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
      const answerLine = generateFieldLine(
        answer,
        field,
        richFormValue,
        formSubmissionMessage
      )
      questionLines.push(answerLine)
    }

    questionLines.push('---\n')
    componentMap.set(key, questionLines)
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
  processRepeaterEntries(
    formSubmissionMessage,
    formDefinition,
    formModel,
    componentMap
  )
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
        // For repeaters, return a key for each component within the repeater
        // along with the repeater itself
        const repeaterName = page.repeat.options.name
        return page.components
          .map((component) => `${repeaterName}__${component.name}`)
          .concat([repeaterName])
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
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, FormValue, FormStateValue, FileState, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
