export const EN_GB = 'en-GB'
export const CY = 'cy'

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
    i18nInstance.addResourceBundle(EN_GB, 'form', translations, true, true)
  }
}

/**
 * @import { i18n } from 'i18next'
 * @import { FormMetadata } from '@defra/forms-model'
 */
