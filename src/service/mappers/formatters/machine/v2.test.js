import { buildDefinition } from '@defra/forms-model/stubs'

import {
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
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
    jest.useFakeTimers().setSystemTime(new Date('2025-09-01T00:00:00Z'))
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  it('should return a valid machine v2 response', () => {
    const definition = buildDefinition({
      ...exampleNotifyFormDefinition,
      output: {
        audience: 'machine',
        version: '2'
      }
    })
    const formatter = getFormatter('machine', '2')
    expect(
      JSON.parse(formatter(exampleNotifyFormMessage, definition, '2'))
    ).toEqual({
      meta: {
        schemaVersion: '2',
        timestamp: expect.any(String),
        definition,
        referenceNumber: '874-C7C-D60'
      },
      data: {
        main: {
          JHCHVE: 'Someone',
          hTFiWF: {
            addressLine1: '1 Anywhere Street',
            town: 'Anywhereville',
            county: 'Anywhereshire',
            postcode: 'AN1 2WH'
          },
          zznFWF: { day: 1, month: 1, year: 2000 },
          KGSRJU: { month: 8, year: 2025 },
          hVcHQv: ['Gandalf', 'Frodo']
        },
        repeaters: {
          repeaterOptionName: [
            {
              repeaterComponentName: 'Frodo',
              repeaterComponentDate: { day: 1, month: 1, year: 2000 }
            },
            {
              repeaterComponentName: 'Gandalf',
              repeaterComponentDate: { day: 1, month: 1, year: 2020 }
            }
          ]
        },
        files: {
          IWEgMu: [
            {
              fileName: 'supporting_evidence.pdf',
              fileId: 'ef4863e9-7e9e-40d0-8fea-cf34faf098cd',
              userDownloadLink:
                'http://localhost:3005/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd'
            }
          ]
        }
      }
    })
  })
})
