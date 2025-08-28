import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'

import { config } from '~/src/config/index.js'

const designerUrl = config.get('designerUrl')

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
  const formModel = new FormModel(formDefinition, { basePath: '' }, {})
  const {
    main: mainInput,
    repeaters: repeatersInput,
    files: filesInput
  } = formSubmissionMessage.data

  /**
   * @param {string} key
   * @param {RichFormValue} value
   */
  function mapField([key, value]) {
    const component = formModel.componentMap.get(key)
    const mappedValue = component.getContextValueFromFormValue(value)

    return [key, mappedValue?.toString() ?? '']
  }

  /**
   * @param {Record<string, RichFormValue>} richFormRecord
   */
  function mapRecord(richFormRecord) {
    return Object.fromEntries(Object.entries(richFormRecord).map(mapField))
  }

  const main = mapRecord(mainInput)
  const repeaters = Object.fromEntries(
    Object.entries(repeatersInput).map(([key, values]) => {
      return [key, values.map(mapRecord)]
    })
  )
  const files = Object.fromEntries(
    Object.entries(filesInput).map(([key, value]) => {
      const component = formModel.componentMap.get(key)
      const fileUploadState =
        component.getContextValueFromFormValue(value) ?? []

      return fileUploadState.map((fileId) => {
        return {
          fileId,
          userDownloadLink: `${designerUrl}/file-download/${fileId}`
        }
      })
    })
  )

  return {
    main,
    repeaters,
    files
  }
}

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { RichFormValue } from '@defra/forms-engine-plugin/engine/outputFormatters/machine/v2.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
