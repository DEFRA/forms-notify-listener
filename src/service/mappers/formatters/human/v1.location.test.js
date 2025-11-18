import { FormAdapterSubmissionSchemaVersion } from '@defra/forms-engine-plugin/engine/types/enums.js'
import { ComponentType, Engine, SchemaVersion } from '@defra/forms-model'
import { buildDefinition, buildQuestionPage } from '@defra/forms-model/stubs'

import {
  buildFormAdapterSubmissionMessage,
  buildFormAdapterSubmissionMessageMetaStub
} from '~/src/service/__stubs__/event-builders.js'
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
    get: jest.fn(() => 'http://designer')
  }
}))

describe('Location field formatting in Human V1', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-04-01T23:00:00Z'))
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  afterAll(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('EastingNorthingField', () => {
    it('should format Easting and Northing on separate lines', () => {
      const formDefinition = buildDefinition({
        name: 'Location Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/location',
        pages: [
          buildQuestionPage({
            path: '/location',
            title: 'Location Page',
            components: [
              {
                type: ComponentType.EastingNorthingField,
                name: 'locationEN',
                title: 'What is your location?',
                options: {
                  required: true
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Location Test Form',
          schemaVersion: FormAdapterSubmissionSchemaVersion.V1
        }),
        data: {
          main: {
            locationEN: {
              easting: 123456,
              northing: 654321
            }
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What is your location?')
      expect(output).toContain('Northing: 654321')
      expect(output).toContain('Easting: 123456')
      expect(output).not.toContain('654321, 123456')
    })

    it('should handle empty Easting and Northing values', () => {
      const formDefinition = buildDefinition({
        name: 'Location Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/location',
        pages: [
          buildQuestionPage({
            path: '/location',
            title: 'Location Page',
            components: [
              {
                type: ComponentType.EastingNorthingField,
                name: 'locationEN',
                title: 'What is your location?',
                options: {
                  required: false
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Location Test Form'
        }),
        data: {
          main: {
            locationEN: null
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What is your location?')
      expect(output).not.toContain('Northing:')
      expect(output).not.toContain('Easting:')
    })
  })

  describe('LatLongField', () => {
    it('should format Latitude and Longitude on separate lines', () => {
      const formDefinition = buildDefinition({
        name: 'Coordinates Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/coordinates',
        pages: [
          buildQuestionPage({
            path: '/coordinates',
            title: 'Coordinates Page',
            components: [
              {
                type: ComponentType.LatLongField,
                name: 'locationLL',
                title: 'What are your coordinates?',
                options: {
                  required: true
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Coordinates Test Form',
          schemaVersion: FormAdapterSubmissionSchemaVersion.V1
        }),
        data: {
          main: {
            locationLL: {
              latitude: 51.51945,
              longitude: -0.127758
            }
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What are your coordinates?')
      expect(output).toContain('Latitude: 51.51945')
      expect(output).toContain('Longitude: -0.127758')
      expect(output).not.toContain('51.51945, -0.127758')
    })

    it('should handle empty Latitude and Longitude values', () => {
      const formDefinition = buildDefinition({
        name: 'Coordinates Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/coordinates',
        pages: [
          buildQuestionPage({
            path: '/coordinates',
            title: 'Coordinates Page',
            components: [
              {
                type: ComponentType.LatLongField,
                name: 'locationLL',
                title: 'What are your coordinates?',
                options: {
                  required: false
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Coordinates Test Form'
        }),
        data: {
          main: {
            locationLL: null
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What are your coordinates?')
      expect(output).not.toContain('Lat:')
      expect(output).not.toContain('Long:')
    })
  })

  describe('Simple location fields', () => {
    it('should format OS Grid Reference as single value', () => {
      const formDefinition = buildDefinition({
        name: 'Grid Ref Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/grid',
        pages: [
          buildQuestionPage({
            path: '/grid',
            title: 'Grid Page',
            components: [
              {
                type: ComponentType.OsGridRefField,
                name: 'gridRef',
                title: 'What is your OS grid reference?',
                options: {
                  required: true
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Grid Ref Test Form'
        }),
        data: {
          main: {
            gridRef: 'TQ123456'
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What is your OS grid reference?')
      expect(output).toContain('TQ123456')
    })

    it('should format National Grid Field Number as single value', () => {
      const formDefinition = buildDefinition({
        name: 'National Grid Test Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/national',
        pages: [
          buildQuestionPage({
            path: '/national',
            title: 'National Grid Page',
            components: [
              {
                type: ComponentType.NationalGridFieldNumberField,
                name: 'ngField',
                title: 'What is your National Grid field number?',
                options: {
                  required: true
                }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'National Grid Test Form'
        }),
        data: {
          main: {
            ngField: 'NG12345678'
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      expect(output).toContain('## What is your National Grid field number?')
      expect(output).toContain('NG12345678')
    })
  })

  describe('Mixed form with multiple location fields', () => {
    it('should format all location field types correctly', () => {
      const formDefinition = buildDefinition({
        name: 'Mixed Location Form',
        engine: Engine.V2,
        schema: SchemaVersion.V2,
        startPage: '/locations',
        pages: [
          buildQuestionPage({
            path: '/locations',
            title: 'Locations Page',
            components: [
              {
                type: ComponentType.EastingNorthingField,
                name: 'locationEN',
                title: 'Easting and Northing',
                options: { required: true }
              },
              {
                type: ComponentType.LatLongField,
                name: 'locationLL',
                title: 'Latitude and Longitude',
                options: { required: true }
              },
              {
                type: ComponentType.OsGridRefField,
                name: 'gridRef',
                title: 'OS Grid Reference',
                options: { required: true }
              },
              {
                type: ComponentType.NationalGridFieldNumberField,
                name: 'ngField',
                title: 'National Grid Field Number',
                options: { required: true }
              }
            ]
          })
        ]
      })

      const formSubmissionMessage = buildFormAdapterSubmissionMessage({
        meta: buildFormAdapterSubmissionMessageMetaStub({
          formName: 'Mixed Location Form'
        }),
        data: {
          main: {
            locationEN: {
              easting: 123456,
              northing: 654321
            },
            locationLL: {
              latitude: 51.51945,
              longitude: -0.127758
            },
            gridRef: 'TQ123456',
            ngField: 'NG12345678'
          },
          repeaters: {},
          files: {}
        },
        result: {
          files: {
            main: 'main-csv-id',
            repeaters: {}
          }
        }
      })

      const formatter = getFormatter('human', '1')
      const output = formatter(formSubmissionMessage, formDefinition, '1')

      // Check Easting and Northing
      expect(output).toContain('## Easting and Northing')
      expect(output).toContain('Northing: 654321')
      expect(output).toContain('Easting: 123456')

      // Check Latitude and Longitude
      expect(output).toContain('## Latitude and Longitude')
      expect(output).toContain('Latitude: 51.51945')
      expect(output).toContain('Longitude: -0.127758')

      // Check OS Grid Reference
      expect(output).toContain('## OS Grid Reference')
      expect(output).toContain('TQ123456')

      // Check National Grid Field Number
      expect(output).toContain('## National Grid Field Number')
      expect(output).toContain('NG12345678')
    })
  })
})
