import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import * as Components from '@defra/forms-engine-plugin/engine/components/index.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { Engine, hasComponents, hasRepeater } from '@defra/forms-model'

import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import { getRelevantPagesForLegacy } from '~/src/service/mappers/formatters/human/v1.js'
import {
  findRepeaterPageByKey,
  formatGeospatialField,
  formatLocationField,
  formatMultilineTextField,
  formatUkAddressField
} from '~/src/service/mappers/formatters/shared.js'

/**
 * Check if an optional field should be skipped (no value provided)
 * @param {Component} field
 * @param {RichFormValue | null} richFormValue
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
 * @param {Translator} translator
 * @returns {Map<string, string[]>}
 */
function processMainEntries(formSubmissionMessage, formModel, translator) {
  const { tComponent } = translator

  const componentMap = new Map()

  const mainEntries = Object.entries({
    ...formSubmissionMessage.data.main,
    ...formSubmissionMessage.data.files
  })

  for (const [key, richFormValue] of mainEntries) {
    const field = formModel.componentMap.get(key)

    if (!(field instanceof FormComponent)) {
      continue
    }

    if (
      shouldSkipOptionalField(
        field,
        /** @type {RichFormValue | null} */ (richFormValue)
      )
    ) {
      continue
    }

    const answer = field.getDisplayStringFromFormValue(
      /** @type {any} */ (richFormValue),
      translator
    )

    // Also skip if optional and the display string is empty
    if (!field.options.required && answer === '') {
      continue
    }

    const questionLines = /** @type {string[]} */ ([])
    const label = escapeContent(
      tComponent(/** @type {ComponentDef} */ (field), 'title')
    )

    // Questions use heading level 1 (#)
    questionLines.push(`# ${label}\n`)

    // Generate the answer line(s)
    const answerLine = generateFieldLine(
      answer,
      field,
      /** @type {RichFormValue} */ (/** @type {unknown} */ (richFormValue)),
      translator
    )
    questionLines.push(answerLine)

    componentMap.set(key, questionLines)
  }

  return componentMap
}

/**
 * Process a single repeater component across all items
 * @param {string} repeaterTitle
 * @param {FormComponent} componentField
 * @param {string} componentName
 * @param {Record<string, RichFormValue | null>[]} repeaterItems
 * @param {Translator} translator
 * @returns {string[]}
 */
function processRepeaterComponent(
  repeaterTitle,
  componentField,
  componentName,
  repeaterItems,
  translator
) {
  const { tComponent } = translator
  const questionLines = /** @type {string[]} */ ([])
  const componentLabel = escapeContent(
    tComponent(/** @type {ComponentDef} */ (componentField), 'title')
  )

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
    const componentAnswer = componentField.getDisplayStringFromFormValue(
      /** @type {any} */ (componentValue),
      translator
    )

    // Repeater item label uses heading level 2 (##)
    questionLines.push(`## ${escapeContent(itemLabel)}\n`)

    // Answer beneath with blank line separation
    questionLines.push(
      generateFieldLine(
        componentAnswer,
        /** @type {Component} */ (/** @type {unknown} */ (componentField)),
        componentValue,
        translator
      )
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
 * @param {Translator} translator
 * @returns {Map<string, string[]>}
 */
function processRepeaterEntries(
  formSubmissionMessage,
  formDefinition,
  formModel,
  translator
) {
  const { tPage } = translator

  const componentMap = new Map()

  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)

  for (const [key, repeaterData] of repeaterEntries) {
    const repeaterPage = findRepeaterPageByKey(key, formDefinition)

    if (!hasRepeater(repeaterPage)) {
      continue
    }

    const repeaterTitle =
      escapeContent(tPage(repeaterPage, 'repeatTitle')) ||
      repeaterPage.repeat.options.title
    const repeaterItems =
      /** @type {Record<string, RichFormValue | null>[]} */ (repeaterData)

    if (!hasComponents(repeaterPage)) {
      continue
    }

    // Filtering out guidance components by checking for 'title' property (isFormComponent property is not available).
    for (const componentDef of repeaterPage.components.filter(
      (cd) => 'title' in cd
    )) {
      const componentName = componentDef.name
      const componentField = formModel.componentMap.get(componentName)

      if (!(componentField instanceof FormComponent)) {
        continue
      }

      const questionLines = processRepeaterComponent(
        repeaterTitle,
        componentField,
        componentName,
        repeaterItems,
        translator
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
 * @param {Translator} translator
 * @returns {string}
 */
export function formatter(formSubmissionMessage, formDefinition, translator) {
  const formModel = new FormModel(
    formDefinition,
    { basePath: '' },
    /** @type {any} */ ({})
  )
  const order = calculateOrder(formDefinition, formSubmissionMessage)

  // Process main entries and repeater entries
  const mainComponents = processMainEntries(
    formSubmissionMessage,
    formModel,
    translator
  )
  const repeaterComponents = processRepeaterEntries(
    formSubmissionMessage,
    formDefinition,
    formModel,
    translator
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
  const formAdapterFiles = /** @type {FormAdapterFile[]} */ (
    /** @type {unknown} */ (richFormValue)
  )

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
 * @param {ListFormComponent} field
 * @param {RichFormValue} richFormValue
 * @param {Translator} translator
 * @returns {string}
 */
function formatListFormComponent(_answer, field, richFormValue, translator) {
  const { tListItem } = translator
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
    return `${escapeContent(tListItem(items[0], 'text'))}\n`
  }

  // Multiple answers: use bullet points
  const formattedItems = items
    .map((/** @type {any} */ item) => {
      const label = escapeContent(tListItem(item, 'text'))
      return `* ${label}\n`
    })
    .join('')

  return formattedItems
}

/**
 * Map of component types to their formatting handlers
 * Using Map to preserve class constructor references
 * @type {Map<new (...args: any[]) => Component, (answer: string, field: Component, richFormValue: RichFormValue, formSubmissionMessage: FormAdapterSubmissionMessage, translator: Translator) => string>}
 */
const fieldHandlers = new Map()
fieldHandlers.set(Components.FileUploadField, formatFileUploadField)
fieldHandlers.set(Components.MultilineTextField, formatMultilineTextField)
fieldHandlers.set(Components.UkAddressField, formatUkAddressField)
fieldHandlers.set(Components.EastingNorthingField, formatLocationField)
fieldHandlers.set(Components.LatLongField, formatLocationField)
fieldHandlers.set(Components.GeospatialField, formatGeospatialField)

/**
 * Generate formatted line for a field value
 * @param {string} answer
 * @param {Component} field
 * @param {RichFormValue} richFormValue
 * @param {Translator} translator
 * @returns {string}
 */
function generateFieldLine(answer, field, richFormValue, translator) {
  // Check list component first (special case with multiple inheritance)
  if (field instanceof ListFormComponent && field instanceof FormComponent) {
    return formatListFormComponent(answer, field, richFormValue, translator)
  }

  const dummyFormSubmissionMessage =
    /** @type {FormAdapterSubmissionMessage} */ ({})

  // Iterate through registered handlers
  for (const [Type, handler] of fieldHandlers) {
    if (field instanceof Type) {
      return handler(
        answer,
        field,
        richFormValue,
        dummyFormSubmissionMessage,
        translator
      )
    }
  }

  // Default handler for all other field types
  return `${escapeContent(answer)}\n`
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
 * @import { FormAdapterSubmissionMessage, FormAdapterFile, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 * @import { ComponentDef, FormDefinition } from '@defra/forms-model'
 */
