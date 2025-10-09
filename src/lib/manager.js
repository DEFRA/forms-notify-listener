import { FormStatus } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getJson } from '~/src/lib/fetch.js'

const managerUrl = config.get('managerUrl')
/**
 * Gets the form definition from the Forms Manager API∂
 * @param {string} formId
 * @param {FormStatus} formStatus
 * @param {number|undefined} versionNumber - Optional specific version to fetch
 * @returns {Promise<FormDefinition>}
 */
export async function getFormDefinition(formId, formStatus, versionNumber) {
  if (!managerUrl) {
    throw new Error('Missing MANAGER_URL')
  }

  const statusPath = formStatus === FormStatus.Draft ? FormStatus.Draft : ''
  const formUrl =
    versionNumber !== undefined
      ? new URL(
          `/forms/${formId}/versions/${versionNumber}/definition`,
          managerUrl
        )
      : new URL(`/forms/${formId}/definition/${statusPath}`, managerUrl)

  const { body } = await getJson(formUrl)

  return body
}

/**
 * Gets the form metadata from the Forms Manager API
 * @param {string} formId
 * @returns {Promise<FormMetadata>}
 */
export async function getFormMetadata(formId) {
  if (!managerUrl) {
    throw new Error('Missing MANAGER_URL')
  }

  const formUrl = new URL(`/forms/${formId}`, managerUrl)

  const { body } = await getJson(formUrl)

  return body
}

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 */
