import { FormStatus } from '@defra/forms-model'
import { buildDefinition } from '@defra/forms-model/stubs'

import { stringExistsFromPosition } from '~/src/helpers/string-utils.js'
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
} from '~/src/service/mappers/formatters/human/v2.js'
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
    it('should return a valid human readable v2 response', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        }
      })
      const formatter = getFormatter('human', '2')
      const output = formatter(exampleNotifyFormMessage, definition, '1')

      let pos = 0
      pos = stringExistsFromPosition(
        output,
        pos,
        '^ For security reasons, the links in this email expire at'
      )
      pos = stringExistsFromPosition(
        output,
        pos,
        'Example notify form form received at'
      )
      pos = stringExistsFromPosition(output, pos, '## What is your name?')
      pos = stringExistsFromPosition(output, pos, 'Someone')
      pos = stringExistsFromPosition(output, pos, '## Additional details')
      pos = stringExistsFromPosition(output, pos, '## What is your address?')
      pos = stringExistsFromPosition(output, pos, '1 Anywhere Street')
      pos = stringExistsFromPosition(output, pos, 'Anywhereville')
      pos = stringExistsFromPosition(output, pos, 'Anywhereshire')
      pos = stringExistsFromPosition(output, pos, 'AN1 2WH')
      pos = stringExistsFromPosition(
        output,
        pos,
        '## What is your date of birth?'
      )
      pos = stringExistsFromPosition(output, pos, '1 January 2000')
      pos = stringExistsFromPosition(output, pos, '## What month is it?')
      pos = stringExistsFromPosition(output, pos, 'August 2025')
      pos = stringExistsFromPosition(
        output,
        pos,
        "# What is the team member\\'s name?"
      )
      pos = stringExistsFromPosition(output, pos, '## Team Member 1')
      pos = stringExistsFromPosition(output, pos, 'Frodo')
      pos = stringExistsFromPosition(output, pos, '## Team Member 2')
      pos = stringExistsFromPosition(output, pos, 'Gandalf')
      pos = stringExistsFromPosition(
        output,
        pos,
        "# What is the team member\\'s date of birth?"
      )
      pos = stringExistsFromPosition(output, pos, '## Team Member 1')
      pos = stringExistsFromPosition(output, pos, '1 January 2000')
      pos = stringExistsFromPosition(output, pos, '## Team Member 2')
      pos = stringExistsFromPosition(output, pos, '1 January 2020')
      pos = stringExistsFromPosition(output, pos, '## Team Member')
      pos = stringExistsFromPosition(
        output,
        pos,
        '[Download&nbsp;Team&nbsp;Member&nbsp;(CSV)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)'
      )
      pos = stringExistsFromPosition(
        output,
        pos,
        '## Who are your favourite LotR characters?'
      )
      pos = stringExistsFromPosition(output, pos, '* Gandalf')
      pos = stringExistsFromPosition(output, pos, '* Frodo')
      pos = stringExistsFromPosition(
        output,
        pos,
        '## Please add supporting evidence'
      )
      pos = stringExistsFromPosition(output, pos, 'Uploaded 1 file')
      pos = stringExistsFromPosition(
        output,
        pos,
        '* [supporting_evidence.pdf](http://designer/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd)'
      )
      pos = stringExistsFromPosition(
        output,
        pos,
        '## Geospatial features of the site'
      )
      pos = stringExistsFromPosition(output, pos, '## Sites')
      stringExistsFromPosition(
        output,
        pos,
        '[Download&nbsp;main&nbsp;form&nbsp;(CSV)](http://designer/file-download/818d567d-ee05-4a7a-8c49-d5c54fb09b16)'
      )
      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v2 response in preview mode', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        }
      })
      const formatter = getFormatter('human', '2')
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

    it('should return a valid human readable v2 response with reference number', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        },
        options: {
          showReferenceNumber: true
        }
      })
      const formatter = getFormatter('human', '2')
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

    it('should return a valid human readable v2 response in Draft mode', () => {
      const definition = buildDefinition({
        ...exampleNotifyFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        }
      })
      const formatter = getFormatter('human', '2')
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

    it('should return a valid human readable v2 response 2', () => {
      const definition = buildDefinition({
        ...pizzaFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        }
      })
      const formatter = getFormatter('human', '2')
      const output = formatter(pizzaMessage, definition, '2')
      expect(output).toMatchSnapshot()
    })

    it('should return a valid human readable v2 response for legacy graph-based forms', () => {
      const definition = buildDefinition({
        ...legacyGraphFormDefinition,
        output: {
          audience: 'human',
          version: '2'
        }
      })
      const formatter = getFormatter('human', '2')
      const output = formatter(legacyGraphFormMessage, definition, '2')

      expect(output).toMatchSnapshot()
    })

    it('should handle geospatial fields', () => {
      const definition = geospatialFormDefinition
      const formatter = getFormatter('human', '2')
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
          version: '2'
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

      const formatter = getFormatter('human', '2')
      const output = formatter(messageWithPayment, definition, '2')

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
          version: '2'
        }
      })

      const messageWithNoPayment = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          payment: undefined
        }
      })

      const formatter = getFormatter('human', '2')
      const output = formatter(messageWithNoPayment, definition, '2')

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
          version: '2'
        }
      })

      const messageWithNoPayment = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          payment: undefined
        }
      })

      const formatter = getFormatter('human', '2')
      const output = formatter(messageWithNoPayment, definition, '2')

      expect(output).not.toContain('# Payment details')
    })
  })
})
