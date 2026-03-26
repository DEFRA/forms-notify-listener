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

  it('should return a valid machine v1 response', () => {
    const definition = buildDefinition({
      ...exampleNotifyFormDefinition,
      output: {
        audience: 'machine',
        version: '1'
      }
    })
    const formatter = getFormatter('machine', '1')
    const formatted = JSON.parse(
      formatter(exampleNotifyFormMessage, definition, '1')
    )
    expect(formatted).toEqual({
      meta: {
        schemaVersion: '1',
        timestamp: expect.any(String),
        referenceNumber: '874-C7C-D60',
        definition: {
          ...exampleNotifyFormDefinition,
          output: { audience: 'machine', version: '1' }
        }
      },
      data: {
        main: {
          ADDDTS: '',
          JHCHVE: 'Someone',
          hTFiWF: '1 Anywhere Street,Anywhereville,Anywhereshire,AN1 2WH',
          zznFWF: '2000-01-01',
          KGSRJU: '2025-08',
          geOSpa:
            '4eba054d-43ad-47a7-9992-186f0c804c99,a3d9f35c-a9fb-4e50-80f1-6144ce534e09,62ef0bb2-c4ce-4d76-bd26-4f0e7cfe5a41',
          hVcHQv: 'Gandalf,Frodo'
        },
        repeaters: {
          repeaterOptionName: [
            {
              repeaterComponentName: 'Frodo',
              repeaterComponentDate: '2000-01-01'
            },
            {
              repeaterComponentName: 'Gandalf',
              repeaterComponentDate: '2020-01-01'
            }
          ],
          gAZbPt: [
            {
              rXmTGb: 'f8930383-fb1f-4f92-bdc2-a7e599e7bff2'
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
