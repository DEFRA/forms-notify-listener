import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'

import {
  extractBaseTranslations,
  storeMetadataBaseTranslations
} from '~/src/i18n/extractBaseTranslations.js'
import { createFormI18nInstance } from '~/src/i18n/index.js'

/**
 * Create a translator for use in unit tests
 * @param { FormMetadata | undefined } metadata
 * @param {FormDefinition} definition
 */
export function createTestTranslator(metadata, definition) {
  const baseTranslations = extractBaseTranslations(definition)
  const i18nInstance = createFormI18nInstance(baseTranslations)
  storeMetadataBaseTranslations(metadata, i18nInstance)
  return createTranslator(i18nInstance, 'en-GB')
}

export const testTranslationsDefinition = /** @type {FormDefinition} */ ({
  pages: [],
  sections: [],
  lists: [],
  conditions: [],
  metadata: {
    translations: {
      cy: {
        'form.submissionGuidance': 'Some submission guidance'
      }
    }
  }
})

/**
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 */
