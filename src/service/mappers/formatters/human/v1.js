import { RepeatPageController } from '@defra/forms-engine-plugin/controllers/RepeatPageController.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'
import { addDays } from 'date-fns'

import { config } from '~/src/config/index.js'
import { format as dateFormat } from '~/src/helpers/date.js'

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

  const fileAndMainEntries = Object.entries({
    ...formSubmissionMessage.data.main,
    ...formSubmissionMessage.data.files
  })

  for (const [key, richFormValue] of fileAndMainEntries) {
    const questionLines = /** @type {string[]} */ ([])
    const field = formModel.componentMap.get(key)
    const answer = field.getDisplayStringFromFormValue(richFormValue)

    const label = escapeMarkdown(field.title)
    questionLines.push(`## ${label}\n`)

    if (richFormValue !== null) {
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

  return lines.join('\n')
}

/**
 *
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {string}
 */
function generateFieldLine(answer, field, richFormValue) {
  // Use escaped display text
  /**
   * @type {string}
   */
  let answerEscaped = `${escapeMarkdown(answer)}\n`

  if (field instanceof Components.FileUploadField) {
    // Skip empty files
    if (!richFormValue?.length) {
      return answerEscaped
    }
    const formAdapterFile = /** @type {FormAdapterFile[]} */ (richFormValue)

    answerEscaped = `${escapeMarkdown(answer)}:\n\n`

    /**
     * @type {string}
     */
    const fileUploadString = formAdapterFile
      .map((file) => {
        const fileUploadFilename = escapeMarkdown(file.fileName)
        return `* [${fileUploadFilename}](${designerUrl}/file-download/${file.fileId})\n`
      })
      .join('')

    // Append bullet points
    answerEscaped += fileUploadString
  } else if (
    field instanceof ListFormComponent &&
    field instanceof FormComponent
  ) {
    const values = new Set(
      [field.getContextValueFromFormValue(richFormValue)].flat()
    )
    const items = field.items.filter(({ value }) => values.has(value))

    // Skip empty values
    if (!items.length) {
      return answerEscaped
    }

    answerEscaped = ''

    // Append bullet points
    answerEscaped += items
      .map((item) => {
        const label = escapeMarkdown(item.text)
        const value = escapeMarkdown(`(${item.value})`)

        let line = label

        // Prepend bullet points for checkboxes only
        if (field instanceof Components.CheckboxesField) {
          line = `* ${line}`
        }

        // Append raw values in parentheses
        // e.g. `* None of the above (false)`
        return `${item.value}`.toLowerCase() !== item.text.toLowerCase()
          ? `${line} ${value}\n`
          : `${line}\n`
      })
      .join('')
  } else if (field instanceof Components.MultilineTextField) {
    // Preserve Multiline text new lines
    answerEscaped = answer
      .split(/(?:\r?\n)+/)
      .map(escapeMarkdown)
      .join('\n')
      .concat('\n')
  } else if (field instanceof Components.UkAddressField) {
    // Format UK addresses into new lines
    answerEscaped = (field.getContextValueFromFormValue(richFormValue) ?? [])
      .map(escapeMarkdown)
      .join('\n')
      .concat('\n')
  }

  return answerEscaped
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
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 */
export function mapValueToState(formSubmissionMessage) {
  const mainEntries = Object.entries(formSubmissionMessage.data.main)
  const main = mainEntries.reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const subValues = Object.entries(value).reduce((acc2, [key2, value2]) => {
        return {
          ...acc2,
          [`${key}__${key2}`]: value2
        }
      }, {})
      return {
        ...acc,
        ...subValues
      }
    }
    return {
      ...acc,
      [key]: value
    }
  }, {})

  const fileEntries = Object.entries(formSubmissionMessage.data.files)
  const files = fileEntries.reduce((fileObject, [key, value]) => {
    const componentFiles = value.map((file) => ({
      status: {
        form: {
          file: {
            contentLength: 0,
            fileStatus: 'complete',
            fileId: file.fileId,
            filename: file.fileName
          }
        },
        uploadStatus: 'ready',
        numberOfRejectedFiles: 0,
        metadata: {
          retrievalKey: ''
        }
      },
      uploadId: 'f1ee2837-7581-4cb0-8113-134527250fee'
    }))
    return {
      ...fileObject,
      [key]: componentFiles
    }
  }, {})

  return {
    $$__referenceNumber: 'REFERENCE_NUMBER',
    ...main,
    ...formSubmissionMessage.data.repeaters,
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
  const { sections } = formDefinition

  /**
   * @type {string[][]}
   */
  const order = []

  ;[undefined, ...sections].forEach((section) => {
    const sectionPages = relevantPages.filter(
      /** @type {(page: PageController) => boolean} */ (
        (page) => page.section === section
      )
    )

    /**
     * @type {string[][]}
     */
    const items = []

    sectionPages.forEach(
      /** @type {(page: PageController) => string[][]} */ (
        (page) => {
          const { collection } = page

          if (page instanceof RepeatPageController) {
            items.push([page.repeat.options.name])
          } else {
            items.push(
              collection.fields.map(
                /** @type {(f: Component) => string} */ ((f) => f.name)
              )
            )
          }
        }
      )
    )

    if (items.length) {
      order.push(...items)
    }
  })

  return order.flat()
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js';
 * @import { PageController } from '@defra/forms-engine-plugin/engine/pageControllers/PageController.js';
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition, PageRepeat } from '@defra/forms-model'
 */
