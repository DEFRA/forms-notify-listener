import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'

/**
 * Machine readable notify formatter v1
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {string} schemaVersion
 */
export function formatter(
  formSubmissionMessage,
  formDefinition,
  schemaVersion
) {
  const machineReadable = {
    meta: {
      schemaVersion,
      timestamp: new Date().toISOString(),
      referenceNumber: formSubmissionMessage.meta.referenceNumber,
      definition: formDefinition
    },
    data: formatData(formSubmissionMessage, formDefinition)
  }
  return JSON.stringify(machineReadable)
}

/**
 *
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @returns {*}
 */
function formatData(formSubmissionMessage, formDefinition) {
  const formModel = new FormModel(formDefinition, { basePath: '' })
  const {
    main: mainInput,
    repeaters: repeatersInput,
    files
  } = formSubmissionMessage.data

  /**
   * @param {[string,RichFormValue|null]} entry
   */
  function mapField([key, value]) {
    const component = formModel.componentMap.get(key)

    if (!component) {
      return [key, '']
    }

    const formField = /** @type {FormComponent} */ (component)
    const mappedValue = formField.getContextValueFromFormValue(
      /** @type {RichFormValue} */ (value ?? undefined)
    )

    return [key, mappedValue?.toString() ?? '']
  }

  /**
   * @param {Record<string, RichFormValue|null>} richFormRecord
   */
  function mapRecord(richFormRecord) {
    return Object.fromEntries(Object.entries(richFormRecord).map(mapField))
  }

  const main = mapRecord(mainInput)
  const repeaters = Object.entries(repeatersInput).reduce(
    (acc, [name, repeater]) => {
      acc[name] = repeater.map(mapRecord)
      return acc
    },
    /** @type {Record<string, any>} */ ({})
  )

  return {
    main,
    repeaters,
    files
  }
}

/**
 * @import { FormComponent } from '@defra/forms-engine-plugin/engine/components/FormComponent.js'
 * @import { FormAdapterSubmissionMessage, RichFormValue } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
