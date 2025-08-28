import { FormStatus } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson } from '~/src/lib/fetch.js'

const managerUrl = config.get('managerUrl')

/**
 * Gets the form definition from the Forms Manager API
 * @param {string} formId
 * @param {FormStatus} formStatus
 * @returns {Promise<FormDefinition>}
 */
export async function getFormDefinition(formId, formStatus) {
  const formUrl = new URL(
    `/forms/${formId}/definition/${formStatus === FormStatus.Draft ? FormStatus.Draft : FormStatus.Live}`,
    managerUrl
  )
  const { body } = await getJson(formUrl)

  return body
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
