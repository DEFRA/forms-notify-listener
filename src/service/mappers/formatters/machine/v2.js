/**
 * Machine readable notify formatter v2
 * @param {FormAdapterSubmissionMessage} formSubmissionMessage
 * @param {FormDefinition} formDefinition
 * @param {string} schemaVersion
 */
export function formatter(
  formSubmissionMessage,
  formDefinition,
  schemaVersion
) {
  const { main: machineV1Main, ...machineV1Data } = formSubmissionMessage.data

  const main = Object.fromEntries(
    Object.entries(machineV1Main).filter(([, value]) => {
      return value !== null
    })
  )

  const data = {
    ...machineV1Data,
    main
  }

  const machineReadable = {
    meta: {
      schemaVersion,
      timestamp: new Date().toISOString(),
      referenceNumber: formSubmissionMessage.meta.referenceNumber,
      definition: formDefinition
    },
    data
  }

  return JSON.stringify(machineReadable)
}

/**
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
