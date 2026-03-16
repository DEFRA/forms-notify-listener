import { RepeatPageController } from '@defra/forms-engine-plugin/controllers/RepeatPageController.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  FileStatus,
  UploadStatus
} from '@defra/forms-engine-plugin/engine/types/enums.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'

import { format as dateFormat } from '~/src/helpers/date.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'

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
 * Calculate the order of components for output
 * For repeaters, returns keys in format `repeaterName__componentName` for each component
 * @param {FormDefinition} formDefinition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string[]}
 */
export function calculateOrder(formDefinition, formSubmissionMessage) {
  if (formDefinition.engine === Engine.V1) {
    return calculateOrderForLegacy(formDefinition, formSubmissionMessage)
  }

  return formDefinition.pages.flatMap((page) => {
    if (hasComponents(page)) {
      if (hasRepeater(page)) {
        // For repeaters, return a key for each component within the repeater
        const repeaterName = page.repeat.options.name
        return page.components.map(
          (component) => `${repeaterName}__${component.name}`
        )
      }
      return page.components.map((component) => component.name)
    }
    return []
  })
}

/**
 * Calculate the order of components for legacy V1 forms
 * @param {FormDefinition} formDefinition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string[]}
 */
function calculateOrderForLegacy(formDefinition, formSubmissionMessage) {
  const legacyOrder = getRelevantPagesForLegacy(
    formDefinition,
    formSubmissionMessage
  )

  // Expand repeater keys to include component names
  return legacyOrder.flatMap((/** @type {string} */ key) => {
    const repeaterPage = findRepeaterPageByKey(key, formDefinition)
    if (hasRepeater(repeaterPage) && hasComponents(repeaterPage)) {
      return repeaterPage.components.map(
        (component) => `${key}__${component.name}`
      )
    }
    return [key]
  })
}

/**
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
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { PageControllerClass } from '@defra/forms-engine-plugin/engine/pageControllers/helpers/pages.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue, FileState, FormValue, FormStateValue, UploadStatusFileResponse } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
