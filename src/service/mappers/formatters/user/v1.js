import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'

import { escapeAnswer, escapeFileLabel } from '~/src/lib/notify.js'
import { getRelevantPagesForLegacy } from '~/src/service/mappers/formatters/human/v1.js'
import {
  findRepeaterPageByKey,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField
} from '~/src/service/mappers/formatters/shared.js'

/**
 * Check if an optional field should be skipped (no value provided)
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @returns {boolean}
 */
function shouldSkipOptionalField(field, richFormValue) {
  const isRequired = field.options?.required ?? true

  if (isRequired) {
    return false // Never skip a required field
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
 * Process main form entries (non-repeater fields)
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormModel} formModel
 * @returns {Map<string, string[]>}
 */
function processMainEntries(formSubmissionMessage, formModel) {
  const componentMap = new Map()

  const mainEntries = Object.entries({
    ...formSubmissionMessage.data.main,
    ...formSubmissionMessage.data.files
  })

  for (const [key, richFormValue] of mainEntries) {
    const field = formModel.componentMap.get(key)

    if (!field) {
      continue
    }

    if (shouldSkipOptionalField(field, richFormValue)) {
      continue
    }

    const answer = field.getDisplayStringFromFormValue(richFormValue)

    // Also skip if optional and the display string is empty
    if (!field.options?.required && answer === '') {
      continue
    }

    const questionLines = /** @type {string[]} */ ([])
    const label = escapeAnswer(field.title)

    // Questions use heading level 1 (#)
    questionLines.push(`# ${label}\n`)

    // Generate the answer line(s)
    const answerLine = generateFieldLine(answer, field, richFormValue)
    questionLines.push(answerLine)

    componentMap.set(key, questionLines)
  }

  return componentMap
}

/**
 * Process a single repeater component across all items
 * @param {string} repeaterTitle
 * @param {Component} componentField
 * @param {string} componentName
 * @param {Record<string, RichFormValue>[]} repeaterItems
 * @returns {string[]}
 */
function processRepeaterComponent(
  repeaterTitle,
  componentField,
  componentName,
  repeaterItems
) {
  const questionLines = /** @type {string[]} */ ([])
  const componentLabel = escapeAnswer(componentField.title)

  // Question text uses heading level 1 (#)
  questionLines.push(`# ${componentLabel}\n`)

  // Process each repeater item for this component
  for (let i = 0; i < repeaterItems.length; i++) {
    const itemData = repeaterItems[i]
    const componentValue = itemData[componentName]

    // Skip if no value
    if (
      componentValue === null ||
      componentValue === undefined ||
      componentValue === ''
    ) {
      continue
    }

    const itemLabel = `${repeaterTitle} ${i + 1}`
    const componentAnswer =
      componentField.getDisplayStringFromFormValue(componentValue)

    // Repeater item label uses heading level 2 (##)
    questionLines.push(`## ${escapeAnswer(itemLabel)}\n`)

    // Answer beneath with blank line separation
    questionLines.push(
      generateFieldLine(componentAnswer, componentField, componentValue)
    )
  }

  return questionLines
}

/**
 * Process repeater sections
 * Each component in a repeater gets its own section with H1 for question text
 * and H2 for each repeater item label
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {FormModel} formModel
 * @returns {Map<string, string[]>}
 */
function processRepeaterEntries(
  formSubmissionMessage,
  formDefinition,
  formModel
) {
  const componentMap = new Map()

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)

  for (const [key, repeaterData] of repeaterEntries) {
    const repeaterPage = findRepeaterPageByKey(key, formDefinition)

    if (!hasRepeater(repeaterPage)) {
      continue
    }

    const repeaterTitle = escapeAnswer(repeaterPage.repeat.options.title)
    const repeaterItems = /** @type {Record<string, RichFormValue>[]} */ (
      repeaterData
    )

    if (!hasComponents(repeaterPage)) {
      continue
    }

    // Filtering out guidance components by checking for 'title' property (isFormComponent property is not available).
    for (const componentDef of repeaterPage.components.filter(
      (componentDef) => 'title' in componentDef
    )) {
      const componentName = componentDef.name
      const componentField = /** @type {Component} */ (
        formModel.componentMap.get(componentName)
      )

      if (!componentField) {
        continue
      }

      const questionLines = processRepeaterComponent(
        repeaterTitle,
        componentField,
        componentName,
        repeaterItems
      )

      // Store with a unique key for this component within the repeater
      componentMap.set(`${key}__${componentName}`, questionLines)
    }
  }

  return componentMap
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
  const mainComponents = processMainEntries(formSubmissionMessage, formModel)
  const repeaterComponents = processRepeaterEntries(
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
    return `${escapeAnswer(answer)}\n`
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
    return `${escapeAnswer(items[0].text)}\n`
  }

  // Multiple answers: use bullet points
  const formattedItems = items
    .map((/** @type {any} */ item) => {
      const label = escapeAnswer(item.text)
      return `* ${label}\n`
    })
    .join('')

  return formattedItems
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
 * Generate formatted line for a field value
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
  return `${escapeAnswer(answer)}\n`
}

/**
 * Calculate the order of components for output
 * For repeaters, returns keys in format `repeaterName__componentName` for each component
 * @param {FormDefinition} formDefinition
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string[]}
 */
function calculateOrder(formDefinition, formSubmissionMessage) {
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
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { PageControllerClass } from '@defra/forms-engine-plugin/engine/pageControllers/helpers/pages.js'
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue, FormValue, FormStateValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
