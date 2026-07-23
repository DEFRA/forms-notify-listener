import { hasComponentsEvenIfNoNext } from '@defra/forms-model'

/**
 * @typedef {FormDefinitionTranslations[string]} BaseTranslations
 */

/**
 * @param {FormDefinition} def
 * @returns {BaseTranslations}
 */
export function extractBaseTranslations(def) {
  const pages = /** @type {BaseTranslations['pages']} */ ({})
  const components = /** @type {BaseTranslations['components']} */ ({})
  const sections = /** @type {BaseTranslations['sections']} */ ({})
  const listItems = /** @type {BaseTranslations['listItems']} */ ({})
  const form = /** @type {BaseTranslations['form']} */ ({})

  for (const page of def.pages) {
    if (page.id && page.title) {
      pages[page.id] = { title: page.title }
    }

    if (hasComponentsEvenIfNoNext(page)) {
      for (const component of page.components) {
        if (!component.id) continue

        const entry = /** @type {BaseTranslations['components'][string]} */ ({})

        if (component.title) entry.title = component.title
        if ('hint' in component && component.hint) entry.hint = component.hint
        if ('content' in component && component.content) {
          entry.content = component.content
        }
        if ('shortDescription' in component && component.shortDescription) {
          entry.shortDescription = component.shortDescription
        }

        if (Object.keys(entry).length) {
          components[component.id] = entry
        }
      }
    }
  }

  for (const section of def.sections) {
    if (section.id && section.title) {
      sections[section.id] = { title: section.title }
    }
  }

  for (const list of def.lists) {
    for (const item of list.items) {
      if (item.id && item.text) {
        listItems[item.id] = { text: item.text }
      }
    }
  }

  form.title = def.name ?? ''

  return { pages, components, sections, listItems, form }
}

/**
 * Store English values from FormMetadata (form overview page)
 * @param { FormMetadata | undefined } metadata
 * @param {i18n} i18nInstance
 */
export function storeMetadataBaseTranslations(metadata, i18nInstance) {
  if (metadata) {
    const translations = {
      'form.title': metadata.title,
      'form.contact.email.address': metadata.contact?.email?.address ?? '',
      'form.contact.email.responseTime':
        metadata.contact?.email?.responseTime ?? '',
      'form.contact.online.url': metadata.contact?.online?.url ?? '',
      'form.contact.online.text': metadata.contact?.online?.text ?? '',
      'form.contact.phone': metadata.contact?.phone ?? '',
      'form.submissionGuidance': metadata.submissionGuidance ?? '',
      'form.privacyNoticeText': metadata.privacyNoticeText ?? '',
      'form.privacyNoticeUrl': metadata.privacyNoticeUrl ?? ''
    }
    i18nInstance.addResourceBundle('en-GB', 'form', translations, true, true)
  }
}

/**
 * @import { i18n } from 'i18next'
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 * @import { FormDefinitionTranslations } from '@defra/forms-engine-plugin/types'
 */
