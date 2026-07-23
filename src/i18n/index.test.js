import { createFormI18nInstance, t } from '~/src/i18n/index.js'

describe('i18n t()', () => {
  it('returns the English string for a known key', () => {
    expect(t('confirmationEmail.heading', 'en-GB')).toBe('Form submitted')
  })

  it('falls back to en-GB for an unknown language', () => {
    expect(t('confirmationEmail.heading', 'fr')).toBe('Form submitted')
  })

  it('returns the Welsh string for cy locale', () => {
    expect(t('confirmationEmail.heading', 'cy')).toBe(
      "Ffurflen wedi'i chyflwyno"
    )
  })

  it('returns the key string itself when the key does not exist', () => {
    expect(t('does.not.exist', 'en-GB')).toBe('does.not.exist')
  })

  it('interpolates [[...]] placeholders', () => {
    expect(
      t('confirmationEmail.from', 'en-GB', { organisation: 'My org' })
    ).toBe('From My org')
  })
})

describe('createFormI18nInstance', () => {
  const formNamespace = {
    pages: { 'page-id': { title: 'Your personal details' } },
    components: {
      'comp-id': { title: 'First name', hint: 'As shown on licence' }
    },
    sections: {},
    listItems: {},
    form: {}
  }

  it('resolves plugin strings for en-GB', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('en-GB', 'plugin')
    expect(t('confirmationEmail.getHelp')).toBe('Get help')
  })

  it('resolves form content from the form namespace for en-GB', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('en-GB', 'form')
    expect(t('pages.page-id.title')).toBe('Your personal details')
  })

  it('falls back to en-GB form strings for an unknown language', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('cy', 'form')
    expect(t('components.comp-id.title')).toBe('First name')
  })

  it('resolves a Welsh override when registered', () => {
    const instance = createFormI18nInstance(formNamespace)
    instance.addResourceBundle(
      'cy',
      'form',
      { pages: { 'page-id': { title: 'Eich manylion personol' } } },
      true,
      true
    )
    const t = instance.getFixedT('cy', 'form')
    expect(t('pages.page-id.title')).toBe('Eich manylion personol')
  })
})
