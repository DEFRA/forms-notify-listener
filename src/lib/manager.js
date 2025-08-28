// '/forms/{id}/definition/draft'
import { FormStatus as EngineFormStatus } from '@defra/forms-engine-plugin'
import { FormStatus as ManagerFormStatus } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson } from '~/src/lib/fetch.js'

const managerUrl = config.get('managerUrl')

/**
 * Gets the form definition from the Forms Manager API
 * @param {string} formId
 * @param {EngineFormStatus} formStatus
 * @returns {Promise<FormDefinition>}
 */
export async function getFormDefinition(formId, formStatus) {
  const formUrl = new URL(
    `/forms/${formId}/definition/${formStatus === EngineFormStatus.Draft ? ManagerFormStatus.Draft : ManagerFormStatus.Live}`,
    managerUrl
  )
  return getJson(formUrl)
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
