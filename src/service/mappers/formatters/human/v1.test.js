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
  geospatialFormDefinition,
  geospatialMessage,
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
    get: jest.fn((key) => {
      if (key === 'designerUrl') return 'http://designer'
      if (key === 'fileExpiryInMonths') return 9
      return 'mock value'
    })
  }
}))

describe('Page controller helpers', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-07-01T23:00:00Z')) // UTC should map to BST
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
        '[Download&nbsp;Team&nbsp;Member&nbsp;(CSV)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)'
      )
      expect(output).toContain('## Please add supporting evidence')
      expect(output).toContain('Uploaded 1 file')
      expect(output).toContain(
        '* [supporting_evidence.pdf](http://designer/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd)'
      )
      expect(output).toContain('## Geospatial features of the site')

      expect(output).toContain('## Sites')

      expect(output).toContain(
        '[Download&nbsp;main&nbsp;form&nbsp;(CSV)](http://designer/file-download/818d567d-ee05-4a7a-8c49-d5c54fb09b16)'
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

    it('should return a valid human readable v1 response with reference number', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        },
        options: {
          showReferenceNumber: true
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

      expect(output).toContain('Reference number: 874-C7C-D60')
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

    it('should handle geospatial fields', () => {
      const definition = geospatialFormDefinition
      const formatter = getFormatter('human', '1')
      const output = formatter(geospatialMessage, definition)

      expect(output).toContain(`# Geospatial features of the site

Added 3 locations:

The quadrangle:
TQ 29035 79656
-0.14302739537203024, 51.50123314524271
-0.14246620384719222, 51.50069106195494
-0.1416921465718417, 51.50101631270161
-0.14226301381148687, 51.50155839212027
-0.14302739537203024, 51.50123314524271

St James' Park:
TQ 29684 79849
-0.13295710945470773, 51.50270750157188

Constitution Hill:
TQ 28521 79799
-0.14971510866865856, 51.50252738875241
-0.14045925603909382, 51.50222886009584
-0.14007559375386336, 51.50201988887275
-0.14007559375386336, 51.501691503585704
-0.1408908761094949, 51.50022866765107

[View map](http://designer/submission/874-C7C-D60/map-review/ffefd409-f3f4-49fe-882e-6e89f44631b1/8ea12a71-83d0-43d9-9761-dcb3208a30d1)`)
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

  describe('payment details', () => {
    it('should include payment details section when payment exists', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })

      const messageWithPayment = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          payment: {
            paymentId: 'pay_abc123',
            reference: 'REF-123-456',
            amount: 150,
            description: 'Application fee',
            createdAt: '2025-11-10T17:01:29.000Z'
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(messageWithPayment, definition, '1')

      expect(output).toContain('# Payment details')
      expect(output).toContain('## Payment for')
      expect(output).toContain('Application fee')
      expect(output).toContain('## Total amount')
      expect(output).toContain('£150')
      expect(output).toContain('## Date of payment')
      expect(output).toContain('5:01pm on 10 November 2025')
    })

    it('should not include payment details section when no payment exists', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })

      const messageWithNoPayment = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          payment: undefined
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(messageWithNoPayment, definition, '1')

      expect(output).not.toContain('# Payment details')
      expect(output).not.toContain('## Payment for')
      expect(output).not.toContain('## Total amount')
      expect(output).not.toContain('## Date of payment')
    })

    it('should not include payment details section when payment is undefined', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '1'
        }
      })

      const messageWithNoPayment = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          payment: undefined
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(messageWithNoPayment, definition, '1')

      expect(output).not.toContain('# Payment details')
    })
  })
})
