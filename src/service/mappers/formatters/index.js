import { formatter as formatHumanV1 } from '~/src/service/mappers/formatters/human/v1.js'
import { formatter as formatMachineV1 } from '~/src/service/mappers/formatters/machine/v1.js'
import { formatter as formatMachineV2 } from '~/src/service/mappers/formatters/machine/v2.js'

/**
 * @typedef {(
 *   formSubmissionMessage: FormAdapterSubmissionMessage,
 *   formDefinition: FormDefinition,
 *   schemaVersion: string
 * ) => string} Formatter
 */

/**
 * @type {Record<string, Record<string, Formatter | undefined> | undefined>}
 */
const formatters = {
  human: {
    1: formatHumanV1
  },
  machine: {
    1: formatMachineV1,
    2: formatMachineV2
  }
}

/**
 * @param {string} audience
 * @param {string} version
 * @returns {Formatter|*}
 */
export function getFormatter(audience, version) {
  const versions = formatters[audience]

  if (!versions) {
    throw new Error('Unknown audience')
  }

  const formatter = versions[version]

  if (!formatter) {
    throw new Error('Unknown version')
  }

  return formatter
}

/**
 * @import { FormMetadata, SubmitResponsePayload, FormDefinition } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 */
