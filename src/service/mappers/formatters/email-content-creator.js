import { FileUploadField } from '@defra/forms-engine-plugin/engine/components/FileUploadField.js'
import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
import { ListFormComponent } from '@defra/forms-engine-plugin/engine/components/ListFormComponent.js'
import { hasComponents, hasRepeater } from '@defra/forms-model'

import { escapeContent } from '~/src/lib/notify.js'
import { findRepeaterPageByKey } from '~/src/service/mappers/formatters/shared.js'

/**
 * Class to handle email content creation for either internal submission email or user confirmation email
 * (depending on which formatters are passed)
 */
export class EmailContentCreator {
  /**
   * @type { Map<any, (answer: string, field: Component, richFormValue: RichFormValue) => string> }
   * @protected
   */
  _fieldHandlers

  /**
   * @type { (_answer: string, field: Component, richFormValue: RichFormValue) => string }
   * @protected
   */
  _listComponentHandler

  /**
   * @type { (field: Component, richFormValue: RichFormValue, answer: string) => boolean }
   * @protected
   */
  _shouldSkipField

  /**
   * @type { ((file: FormAdapterFile) => FileState) | undefined }
   * @protected
   */
  _fileUploadMapper

  /**
   * @param { Map<any, (answer: string, field: Component, richFormValue: RichFormValue) => string> } fieldHandlers
   * @param { (_answer: string, field: Component, richFormValue: RichFormValue) => string } listComponentHandler
   * @param { (field: Component, richFormValue: RichFormValue, answer: string) => boolean } shouldSkipField
   * @param { ((file: FormAdapterFile) => FileState) | undefined } fileUploadMapper
   */
  constructor(
    fieldHandlers,
    listComponentHandler,
    shouldSkipField,
    fileUploadMapper
  ) {
    this._fieldHandlers = fieldHandlers
    this._listComponentHandler = listComponentHandler
    this._shouldSkipField = shouldSkipField
    this._fileUploadMapper = fileUploadMapper
  }

  /**
   * Process main form entries (non-repeater fields)
   * @param {FormAdapterSubmissionMessage} formSubmissionMessage
   * @param {FormModel} formModel
   * @returns {Map<string, string[]>}
   */
  processMainEntries(formSubmissionMessage, formModel) {
    const componentMap = new Map()

    const mainEntries = Object.entries({
      ...formSubmissionMessage.data.main,
      ...formSubmissionMessage.data.files
    })

    for (const [key, richFormValue] of mainEntries) {
      const questionLines = /** @type {string[]} */ ([])
      const field = formModel.componentMap.get(key)

      let mappedRichFormValue = richFormValue

      if (field instanceof FileUploadField && this._fileUploadMapper) {
        mappedRichFormValue = richFormValue.map(this._fileUploadMapper)
      }

      const answer = field?.getDisplayStringFromFormValue(mappedRichFormValue)

      if (this._shouldSkipField(field, mappedRichFormValue, answer)) {
        continue
      }

      const label = escapeContent(field.title)

      // Questions use heading level 1 (#)
      questionLines.push(`# ${label}\n`)

      // Generate the answer line(s)
      const answerLine = this.generateFieldLine(answer, field, richFormValue)
      questionLines.push(answerLine)

      componentMap.set(key, questionLines)
    }

    return componentMap
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
  processRepeaterEntries(formSubmissionMessage, formDefinition, formModel) {
    const componentMap = new Map()

    const repeaterEntries = Object.entries(formSubmissionMessage.data.repeaters)

    for (const [key, repeaterData] of repeaterEntries) {
      const repeaterPage = findRepeaterPageByKey(key, formDefinition)

      if (!hasRepeater(repeaterPage) || !hasComponents(repeaterPage)) {
        continue
      }

      const repeaterTitle = escapeContent(repeaterPage.repeat.options.title)
      const repeaterItems = /** @type {Record<string, RichFormValue>[]} */ (
        repeaterData
      )

      // Filtering out guidance components by checking for 'title' property (isFormComponent property is not available).
      for (const componentDef of repeaterPage.components.filter(
        (cd) => 'title' in cd
      )) {
        const componentName = componentDef.name
        const componentField = /** @type {Component} */ (
          formModel.componentMap.get(componentName)
        )

        if (componentField) {
          const questionLines = this.processRepeaterComponent(
            repeaterTitle,
            componentField,
            componentName,
            repeaterItems
          )

          // Store with a unique key for this component within the repeater
          componentMap.set(`${key}__${componentName}`, questionLines)
        }
      }
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
  processRepeaterComponent(
    repeaterTitle,
    componentField,
    componentName,
    repeaterItems
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
      // Answer beneath with blank line separation
      questionLines.push(
        `## ${escapeContent(itemLabel)}\n`,
        this.generateFieldLine(componentAnswer, componentField, componentValue)
      )
    }

    return questionLines
  }

  /**
   * Generate formatted line for a field value
   * @param {string} answer
   * @param {Component} field
   * @param {RichFormValue} richFormValue
   * @returns {string}
   */
  generateFieldLine(answer, field, richFormValue) {
    // Check list component first (special case with multiple inheritance)
    if (field instanceof ListFormComponent && field instanceof FormComponent) {
      return this._listComponentHandler(answer, field, richFormValue)
    }

    // Iterate through registered handlers
    for (const [Type, handler] of this._fieldHandlers) {
      if (field instanceof Type) {
        return handler(answer, field, richFormValue)
      }
    }

    // Default handler for all other field types
    return `${escapeContent(answer)}\n`
  }
}

/**
 * @import { Component } from '@defra/forms-engine-plugin/engine/components/helpers/components.js'
 * @import { FileState, FormAdapterFile, FormAdapterSubmissionMessage, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
