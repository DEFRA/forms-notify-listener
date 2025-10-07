import { FormStatus } from '@defra/forms-model'
import { buildDefinition } from '@defra/forms-model/stubs'

import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageMetaStub
} from '~/src/service/__stubs__/event-builders.js'
import {
  legacyGraphFormDefinition,
  legacyGraphFormMessage
} from '~/src/service/mappers/formatters/__stubs__/legacy-form.js'
import {
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage,
  pizzaFormDefinition,
  pizzaMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
import {
  getRelevantPagesForLegacy,
  mapValueToState
} from '~/src/service/mappers/formatters/human/v1.js'
import { getFormatter } from '~/src/service/mappers/formatters/index.js'

jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn(() => {
      return 'http://designer'
    })
  }
}))

describe('Page controller helpers', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-04-01T23:00:00Z')) // UTC should map to BST
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  describe('mapValueToState', () => {
    it('should map adaptor v2 message to state', () => {
      const message = {
        ...legacyGraphFormMessage,
        data: {
          ...legacyGraphFormMessage.data,
          main: {
            ...legacyGraphFormMessage.data.main,
            dateComponent: {
              day: 1,
              month: 1,
              year: 2020
            }
          }
        }
      }
      expect(mapValueToState(message)).toEqual({
        $$__referenceNumber: 'REFERENCE_NUMBER',
        BuYlIg: 'John',
        zFwSsz: 'Doe',
        RRApmV: 'GB-ENG',
        CsWVsY: 4,
        VFhEJu: '23423',
        wqTVdv: 543,
        wGNLPw: [
          {
            IrwAyV: 'Jane',
            MWVjbY: 'Doe',
            dImeLi__month: 1,
            dImeLi__year: 2000,
            itemId: 'a581accd-e989-4500-87da-f3929c192db0'
          },
          {
            IrwAyV: 'Janet',
            MWVjbY: 'Doe',
            dImeLi__month: 1,
            dImeLi__year: 2000,
            itemId: 'a581accd-e989-4500-87da-f3929c192db1'
          }
        ],
        dateComponent__day: 1,
        dateComponent__month: 1,
        dateComponent__year: 2020,
        fileUploadComponent: [
          {
            uploadId: 'f1ee2837-7581-4cb0-8113-134527250fee',
            status: {
              uploadStatus: 'ready',
              metadata: {
                retrievalKey: ''
              },
              form: {
                file: {
                  fileId: '2c39f4bf-2ccc-4b73-8e0e-c91549b56989',
                  filename: 'bank_statement.pdf',
                  fileStatus: 'complete',
                  contentLength: 0
                }
              }
            }
          }
        ]
      })
    })
  })
  describe('format', () => {
    it('should return a valid human readable v1 response', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })
      const formatter = getFormatter('human', '1')
      const output = formatter(exampleNotifyFormMessage, definition, '1')

      expect(output).toContain(
        '^ For security reasons, the links in this email expire at'
      )
      expect(output).toContain('Example notify form form received at')
      expect(output).toContain('## What is your name?')
      expect(output).toContain('Someone')
      expect(output).toContain('## Additional details')
      expect(output).toContain('## What is your address?')
      expect(output).toContain('1 Anywhere Street')
      expect(output).toContain('Anywhereville')
      expect(output).toContain('Anywhereshire')
      expect(output).toContain('AN1 2WH')
      expect(output).toContain('## What is your date of birth?')
      expect(output).toContain('1 January 2000')
      expect(output).toContain('## What month is it?')
      expect(output).toContain('August 2025')
      expect(output).toContain('## Who are your favourite LotR characters?')
      expect(output).toContain('* Gandalf')
      expect(output).toContain('* Frodo')
      expect(output).toContain('## Team Member')
      expect(output).toContain(
        '[Download Team Member \\(CSV\\)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)'
      )
      expect(output).toContain('## Please add supporting evidence')
      expect(output).toContain('Uploaded 1 file:')
      expect(output).toContain(
        '* [supporting\\_evidence\\.pdf](http://designer/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd)'
      )

      expect(output).toContain(
        '[Download main form \\(CSV\\)](http://designer/file-download/818d567d-ee05-4a7a-8c49-d5c54fb09b16)'
      )
      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v1 response in preview mode', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })
      const formatter = getFormatter('human', '1')
      const output = formatter(
        buildFormAdapterSubmissionMessage({
          ...exampleNotifyFormMessage,
          meta: buildFormAdapterSubmissionMessageMetaStub({
            ...exampleNotifyFormMessage.meta,
            isPreview: true
          })
        }),
        definition,
        '1'
      )

      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v1 response in Draft mode', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })
      const formatter = getFormatter('human', '1')
      const output = formatter(
        buildFormAdapterSubmissionMessage({
          ...exampleNotifyFormMessage,
          meta: buildFormAdapterSubmissionMessageMetaStub({
            ...exampleNotifyFormMessage.meta,
            status: FormStatus.Draft
          })
        }),
        definition,
        '1'
      )

      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v1 response 2', () => {
      const definition = buildDefinition({
        ...pizzaFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })
      const formatter = getFormatter('human', '1')
      const output = formatter(pizzaMessage, definition, '1')
      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v1 response for legacy graph-based forms', () => {
      const definition = buildDefinition({
        ...legacyGraphFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })
      const formatter = getFormatter('human', '1')
      const output = formatter(legacyGraphFormMessage, definition, '1')

      expect(output).toMatchSnapshot()
    })
  })

  describe('getRelevantPagesForLegacy', () => {
    it('should get Relevant Pages For Legacy', () => {
      const pages = getRelevantPagesForLegacy(
        legacyGraphFormDefinition,
        legacyGraphFormMessage
      )
      const proofOfAddress = 'fileUploadComponent'
      const yourAge = 'CsWVsY'
      const countryOfBirth = 'RRApmV'
      const passportNumber = 'VFhEJu'

      const numberOfPeople = 'wqTVdv'
      const firstName = 'BuYlIg'
      const lastName = 'zFwSsz'
      const person = 'wGNLPw'

      expect(pages).toEqual([
        yourAge,
        countryOfBirth,
        firstName,
        lastName,
        person,
        passportNumber,
        numberOfPeople,
        proofOfAddress
      ])
    })
  })
})
