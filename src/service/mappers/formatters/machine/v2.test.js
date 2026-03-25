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
          geOSpa: [
            {
              id: '4eba054d-43ad-47a7-9992-186f0c804c99',
              type: 'Feature',
              properties: {
                description: 'The quadrangle',
                coordinateGridReference: 'TQ 28989 79667',
                centroidGridReference: 'TQ 29035 79656'
              },
              geometry: {
                coordinates: [
                  [
                    [-0.14302739537203024, 51.50123314524271],
                    [-0.14246620384719222, 51.50069106195494],
                    [-0.1416921465718417, 51.50101631270161],
                    [-0.14226301381148687, 51.50155839212027],
                    [-0.14302739537203024, 51.50123314524271]
                  ]
                ],
                type: 'Polygon'
              }
            },
            {
              type: 'Feature',
              properties: {
                description: "St James' Park",
                coordinateGridReference: 'TQ 29684 79849',
                centroidGridReference: 'TQ 29684 79849'
              },
              geometry: {
                type: 'Point',
                coordinates: [-0.13295710945470773, 51.50270750157188]
              },
              id: 'a3d9f35c-a9fb-4e50-80f1-6144ce534e09'
            },
            {
              id: '62ef0bb2-c4ce-4d76-bd26-4f0e7cfe5a41',
              type: 'Feature',
              properties: {
                description: 'Constitution Hill',
                coordinateGridReference: 'TQ 28521 79799',
                centroidGridReference: 'TQ 29042 79725'
              },
              geometry: {
                coordinates: [
                  [-0.14971510866865856, 51.50252738875241],
                  [-0.14045925603909382, 51.50222886009584],
                  [-0.14007559375386336, 51.50201988887275],
                  [-0.14007559375386336, 51.501691503585704],
                  [-0.1408908761094949, 51.50022866765107]
                ],
                type: 'LineString'
              }
            }
          ],
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
          ],
          gAZbPt: [
            {
              rXmTGb: [
                {
                  type: 'Feature',
                  properties: {
                    description: 'Point',
                    coordinateGridReference: 'SD 57403 26671',
                    centroidGridReference: 'SD 57403 26671'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [-2.6471947, 53.7346808]
                  },
                  id: 'f8930383-fb1f-4f92-bdc2-a7e599e7bff2'
                }
              ]
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
