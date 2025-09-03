import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import { escapeMarkdown } from '@defra/forms-engine-plugin/engine/components/helpers/index.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { hasComponents, hasRepeater } from '@defra/forms-model'
import { addDays, format as dateFormat } from 'date-fns'

import { config } from '~/src/config/index.js'

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

  const order = formDefinition.pages.flatMap((page) => {
    if (hasComponents(page)) {
      return page.components.map((component) => component.name)
    }
    return []
  })

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

  lines.push(`${formName} form received at ${escapeMarkdown(formattedNow)}.\n`)
  lines.push('---\n')

  Object.entries({
    ...formSubmissionMessage.data.main,
    ...formSubmissionMessage.data.files
  }).forEach(([key, richFormValue]) => {
    const questionLines = /** @type {string[]} */ ([])
    const field = formModel.componentMap.get(key)
    const answer = field.getDisplayStringFromFormValue(richFormValue)

    const label = escapeMarkdown(field.title)
    questionLines.push(`## ${label}\n`)

    const answerLine = generateFieldLine(answer, field, richFormValue)
    questionLines.push(answerLine)
    questionLines.push('---\n')
    componentMap.set(key, questionLines)
  })

  Object.entries(formSubmissionMessage.result.files.repeaters).forEach(
    ([key, fileId]) => {
      const repeaterPage = findRepeaterPageByKey(key, formDefinition)

      const questionLines = /**  @type {string[]}  */ ([])
      if (hasComponents(repeaterPage)) {
        const [component] = repeaterPage.components
        const componentKey = component.name
        const field = formModel.componentMap.get(componentKey)
        const label = escapeMarkdown(field.title)

        questionLines.push(`## ${label}\n`)

        const repeaterFilename = escapeMarkdown(`Download ${label} (CSV)`)
        questionLines.push(
          `[${repeaterFilename}](${designerUrl}/file-download/${fileId})\n`
        )
        questionLines.push('---\n')
        componentMap.set(componentKey, questionLines)
      }
    }
  )

  order.forEach((key) => {
    const componentLines = componentMap.get(key)

    if (componentLines) {
      lines.push(...componentLines)
    }
  })

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
    const values = [field.getContextValueFromFormValue(richFormValue)].flat()
    const items = field.items.filter(({ value }) => values.includes(value))

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
        return `${line} ${value}\n`
      })
      .join('')
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
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js';
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition, PageRepeat } from '@defra/forms-model'
 */
