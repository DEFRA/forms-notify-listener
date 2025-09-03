import { FormStatus } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson } from '~/src/lib/fetch.js'

const managerUrl = config.get('managerUrl')
/**
 * Gets the form definition from the Forms Manager API∂
 * @param {string} formId
 * @param {FormStatus} formStatus
 * @returns {Promise<FormDefinition>}
 */
export async function getFormDefinition(formId, formStatus) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!managerUrl) {
    //  TS / eslint conflict
    throw new Error('Missing MANAGER_URL')
  }
  const formUrl = new URL(
    `/forms/${formId}/definition/${formStatus === FormStatus.Draft ? FormStatus.Draft : ''}`,
    managerUrl
  )
  const { body } = await getJson(formUrl)

  return body
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
