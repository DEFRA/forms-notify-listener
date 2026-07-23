import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'

import { createFormI18nInstance } from '~/src/i18n/index.js'

/** @type { i18n | undefined } */
let instance

/** @type { Translator | undefined } */
let translator

/**
 * Creates a singleton simple translator (containing only the entries in en-GB.json and cy.json,
 * without any form definition translations). For use by the internal submission emails where
 * the only translation needed is for certain components that need to translate fixed key words,
 * for example GeospatialFields needs to translate 'components.geospatialField.added'
 * @returns {Translator}
 */
export function getDefaultTranslator() {
  instance ??= createFormI18nInstance({
    pages: {},
    components: {},
    sections: {},
    listItems: {},
    form: {}
  })
  translator ??= createTranslator(instance, 'en-GB')
  return translator
}

/**
 * @import { i18n } from 'i18next'
 * @import { Translator } from '@defra/forms-engine-plugin/types'
 */
