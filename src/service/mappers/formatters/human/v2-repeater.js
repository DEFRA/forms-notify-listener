import { ComponentType, hasRepeater } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import { generateFieldLine } from '~/src/service/mappers/formatters/human/v2-common.js'
import {
  findRepeaterPageByKey,
  generateGeospatialMapLink
} from '~/src/service/mappers/formatters/shared.js'

const designerUrl = config.get('designerUrl')

/**
 * Process repeater entries and add them to the component map
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {Map<string, string[]>} componentMap
 */
export function processRepeaterFiles(
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
 * Process a single repeater component across all items
 * @param {string} repeaterTitle
 * @param {Component} componentField
 * @param {string} componentName
 * @param {Record<string, RichFormValue>[]} repeaterItems
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @returns {string[]}
 */
function processRepeaterComponent(
  repeaterTitle,
  componentField,
  componentName,
  repeaterItems,
  formSubmissionMessage
) {
  const questionLines = /** @type {string[]} */ ([])
  const componentLabel = escapeContent(componentField.title)

  // Question text uses heading level 1 (#)
  questionLines.push(`# ${componentLabel}\n`)

  // Process each repeater item for this component
  for (let i = 0; i < repeaterItems.length; i++) {
    const itemData = repeaterItems[i]
    const componentValue = itemData[componentName]

    // Skip if no value
    if (componentValue === undefined || componentValue === '') {
      continue
    }

    const itemLabel = `${repeaterTitle} ${i + 1}`
    const formField = /** @type {FormComponent} */ (componentField)
    const componentAnswer =
      formField.getDisplayStringFromFormValue(componentValue)

    // Repeater item label uses heading level 2 (##)
    questionLines.push(
      `## ${escapeContent(itemLabel)}\n`,
      // Answer beneath with blank line separation
      generateFieldLine(
        componentAnswer,
        componentField,
        componentValue,
        formSubmissionMessage
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
 * @param {Map<string, string[]>} componentMap
 */
export function processRepeaterEntries(
  formSubmissionMessage,
  formDefinition,
  formModel,
  componentMap
) {
  const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)

  for (const [key, repeaterData] of repeaterEntries) {
    const repeaterPage = /** @type {PageRepeat} */ (
      findRepeaterPageByKey(key, formDefinition)
    )

    const repeaterTitle = escapeContent(repeaterPage.repeat.options.title)
    const repeaterItems = /** @type {Record<string, RichFormValue>[]} */ (
      repeaterData
    )

    // Filtering out guidance components by checking for 'title' property (isFormComponent property is not available).
    for (const componentDef of repeaterPage.components.filter(
      (cd) => 'title' in cd
    )) {
      const componentName = componentDef.name
      const componentField = formModel.componentMap.get(componentName)

      if (!componentField) {
        continue
      }

      const questionLines = processRepeaterComponent(
        repeaterTitle,
        componentField,
        componentName,
        repeaterItems,
        formSubmissionMessage
      )

      // Store with a unique key for this component within the repeater
      componentMap.set(`${key}__${componentName}`, questionLines)
    }
  }
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
 * @import { FormAdapterSubmissionMessage, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
 * @import { FormDefinition, PageRepeat } from '@defra/forms-model'
 */
