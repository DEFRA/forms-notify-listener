import { ComponentType, hasRepeater } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { escapeContent, escapeFileLabel } from '~/src/lib/notify.js'
import { generateFieldLine } from '~/src/service/mappers/formatters/human/v2-common.js'
import {
  findRepeaterPageByKey,
  generateGeospatialMapLink,
  repeaterAnswersKey
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

    questionLines.push(`# ${label}\n`)

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
 * Process a single repeater item, listing every component answer for that item
 * @param {string} itemLabel
 * @param {Component[]} componentFields
 * @param {Record<string, RichFormValue>} itemData
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {Translator} translator
 * @returns {string[]}
 */
function processRepeaterItem(
  itemLabel,
  componentFields,
  itemData,
  formSubmissionMessage,
  translator
) {
  const answerLines = /** @type {string[]} */ ([])

  for (const componentField of componentFields) {
    const componentValue = itemData[componentField.name]

    // Skip if no value
    if (componentValue === undefined || componentValue === '') {
      continue
    }

    const formField = /** @type {FormComponent} */ (componentField)
    const componentAnswer = formField.getDisplayStringFromFormValue(
      componentValue,
      translator
    )

    // Question text uses heading level 2 (##)
    answerLines.push(
      `## ${escapeContent(componentField.title)}\n`,
      // Answer beneath with blank line separation
      generateFieldLine(
        componentAnswer,
        componentField,
        componentValue,
        formSubmissionMessage,
        translator
      )
    )
  }

  // Drop the item entirely when none of its components hold a value
  if (!answerLines.length) {
    return []
  }

  // Repeater item label uses heading level 1 (#)
  return [`# ${escapeContent(itemLabel)}\n`, ...answerLines]
}

/**
 * Process repeater sections
 * Each repeater item gets its own section with H1 for the item label
 * and H2 for each question within that item
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {FormModel} formModel
 * @param {Map<string, string[]>} componentMap
 * @param {Translator} translator
 */
export function processRepeaterEntries(
  formSubmissionMessage,
  formDefinition,
  formModel,
  componentMap,
  translator
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
    const componentFields = repeaterPage.components
      .filter((cd) => 'title' in cd)
      .flatMap((cd) => {
        const field = formModel.componentMap.get(cd.name)
        return field ? [field] : []
      })

    const questionLines = repeaterItems.flatMap((itemData, index) =>
      processRepeaterItem(
        `${repeaterTitle} ${index + 1}`,
        componentFields,
        itemData,
        formSubmissionMessage,
        translator
      )
    )

    // Store the whole repeater under a single key, separate from its CSV link
    componentMap.set(repeaterAnswersKey(key), questionLines)
  }
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
 * @import { FormAdapterSubmissionMessage, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
 * @import { FormDefinition, PageRepeat } from '@defra/forms-model'
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 */
