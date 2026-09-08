import { createTranslator } from '@defra/forms-engine-plugin/engine/i18n/createTranslator.js'
import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import { ComponentType, Engine, SchemaVersion } from '@defra/forms-model'
import {
  buildDefinition,
  buildGeospatialFieldComponent,
  buildRepeaterPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import { EN_GB } from '~/src/i18n/translations-helper.js'
import {
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
import {
  processRepeaterEntries,
  processRepeaterFiles
} from '~/src/service/mappers/formatters/human/v2-repeater.js'
import { createAndPopulatei18nInstance } from '~/src/service/notify.js'

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
jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}))

/**
 * Builds a form model and translator for a definition
 * @param {FormDefinition} formDefinition
 */
function buildModelAndTranslator(formDefinition) {
  const formModel = new FormModel(
    formDefinition,
    { basePath: '' },
    /** @type {any} */ ({})
  )
  const translator = createTranslator(
    createAndPopulatei18nInstance(undefined, formDefinition),
    EN_GB
  )

  return { formModel, translator }
}

/**
 * Builds a message carrying the given repeater answers
 * @param {Record<string, unknown[]>} repeaters
 */
function buildMessageWithRepeaters(repeaters) {
  return /** @type {FormAdapterSubmissionMessage} */ ({
    ...exampleNotifyFormMessage,
    data: {
      ...exampleNotifyFormMessage.data,
      repeaters
    }
  })
}

describe('v2-repeater', () => {
  describe('processRepeaterFiles', () => {
    it('should add a CSV download link and map links for each repeater page', () => {
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(
        exampleNotifyFormMessage,
        exampleNotifyFormDefinition,
        componentMap
      )

      expect([...componentMap.keys()]).toEqual(['repeaterOptionName', 'gAZbPt'])
      expect(componentMap.get('repeaterOptionName')).toEqual([
        '# Team Member responses\n',
        '[Download&nbsp;Team&nbsp;Member&nbsp;responses&nbsp;(CSV)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)\n',
        '---\n'
      ])
      expect(componentMap.get('gAZbPt')).toEqual([
        '# Sites responses\n',
        '[Download&nbsp;Sites&nbsp;responses&nbsp;(CSV)](http://designer/file-download/d24a5133-a4cc-4a9a-8453-0a51e123dcd4)\n',
        '\n[View map](http://designer/submission/874-C7C-D60/map-review/e9016eb6-8436-428b-b5ad-cd5fd8e563c3/8ea12a71-83d0-43d9-9761-dcb3208a30d1)\n',
        '---\n'
      ])
    })

    it('should skip repeater files with no matching repeater page in the definition', () => {
      const message = {
        ...exampleNotifyFormMessage,
        result: {
          ...exampleNotifyFormMessage.result,
          files: {
            ...exampleNotifyFormMessage.result.files,
            repeaters: {
              repeaterOptionName: 'e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9',
              // No page in the definition repeats under this name
              deletedRepeaterName: '9a2b6c3d-1e4f-4a5b-8c7d-0e1f2a3b4c5d'
            }
          }
        }
      }

      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(message, exampleNotifyFormDefinition, componentMap)

      expect(componentMap.has('deletedRepeaterName')).toBe(false)
      expect([...componentMap.keys()]).toEqual(['repeaterOptionName'])
      expect(componentMap.get('repeaterOptionName')).toEqual([
        '# Team Member responses\n',
        '[Download&nbsp;Team&nbsp;Member&nbsp;responses&nbsp;(CSV)](http://designer/file-download/e3005cd2-8b1c-4dc4-b2ac-bd1ff73666a9)\n',
        '---\n'
      ])
    })

    it('should omit map links when the repeater page has no id', () => {
      const definition = buildDefinition({
        pages: [
          buildRepeaterPage({
            id: undefined,
            title: 'Sites',
            path: '/sites',
            components: [buildGeospatialFieldComponent({ name: 'rXmTGb' })],
            repeat: {
              options: { name: 'gAZbPt', title: 'Sites' },
              schema: { min: 1, max: 6 }
            }
          }),
          buildSummaryPage()
        ]
      })

      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(exampleNotifyFormMessage, definition, componentMap)

      expect(componentMap.get('gAZbPt')).toEqual([
        '# Sites responses\n',
        '[Download&nbsp;Sites&nbsp;responses&nbsp;(CSV)](http://designer/file-download/d24a5133-a4cc-4a9a-8453-0a51e123dcd4)\n',
        '---\n'
      ])
    })

    it('should omit map links for geospatial components with no id', () => {
      const definition = buildDefinition({
        pages: [
          buildRepeaterPage({
            id: 'e9016eb6-8436-428b-b5ad-cd5fd8e563c3',
            title: 'Sites',
            path: '/sites',
            components: [
              buildGeospatialFieldComponent({ name: 'rXmTGb', id: undefined })
            ],
            repeat: {
              options: { name: 'gAZbPt', title: 'Sites' },
              schema: { min: 1, max: 6 }
            }
          }),
          buildSummaryPage()
        ]
      })

      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(exampleNotifyFormMessage, definition, componentMap)

      expect(componentMap.get('gAZbPt')).toEqual([
        '# Sites responses\n',
        '[Download&nbsp;Sites&nbsp;responses&nbsp;(CSV)](http://designer/file-download/d24a5133-a4cc-4a9a-8453-0a51e123dcd4)\n',
        '---\n'
      ])
    })

    it('should omit map links when the repeater page holds no geospatial components', () => {
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterFiles(
        exampleNotifyFormMessage,
        exampleNotifyFormDefinition,
        componentMap
      )

      expect(componentMap.get('repeaterOptionName')).not.toContainEqual(
        expect.stringContaining('View map')
      )
    })
  })

  describe('processRepeaterEntries', () => {
    it('should group each repeater item under its own heading', () => {
      const { formModel, translator } = buildModelAndTranslator(
        exampleNotifyFormDefinition
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterEntries(
        exampleNotifyFormMessage,
        exampleNotifyFormDefinition,
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([
        '# Team Member 1\n',
        "## What is the team member\\'s name?\n",
        'Frodo\n',
        "## What is the team member\\'s date of birth?\n",
        '1 January 2000\n',
        '# Team Member 2\n',
        "## What is the team member\\'s name?\n",
        'Gandalf\n',
        "## What is the team member\\'s date of birth?\n",
        '1 January 2020\n'
      ])
    })

    it('should format geospatial answers within repeater items', () => {
      const { formModel, translator } = buildModelAndTranslator(
        exampleNotifyFormDefinition
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())

      processRepeaterEntries(
        exampleNotifyFormMessage,
        exampleNotifyFormDefinition,
        formModel,
        componentMap,
        translator
      )

      const lines = componentMap.get('gAZbPt__answers')

      expect(lines?.[0]).toBe('# Sites 1\n')
      expect(lines?.[1]).toBe('## Geospatial features of the site\n')
      expect(lines?.[2]).toContain(
        'Point:\nSD 57403 26671\n-2.6471947, 53.7346808'
      )
      expect(lines?.[2]).toContain(
        '[View map](http://designer/submission/874-C7C-D60/map-review/e9016eb6-8436-428b-b5ad-cd5fd8e563c3/8ea12a71-83d0-43d9-9761-dcb3208a30d1)'
      )
    })

    it('should skip components with an undefined or empty value', () => {
      const { formModel, translator } = buildModelAndTranslator(
        exampleNotifyFormDefinition
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({
        repeaterOptionName: [
          {
            repeaterComponentName: 'Frodo',
            repeaterComponentDate: undefined
          },
          {
            repeaterComponentName: '',
            repeaterComponentDate: { day: 1, month: 1, year: 2020 }
          }
        ]
      })

      processRepeaterEntries(
        message,
        exampleNotifyFormDefinition,
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([
        '# Team Member 1\n',
        "## What is the team member\\'s name?\n",
        'Frodo\n',
        '# Team Member 2\n',
        "## What is the team member\\'s date of birth?\n",
        '1 January 2020\n'
      ])
    })

    it('should drop repeater items holding no answers', () => {
      const { formModel, translator } = buildModelAndTranslator(
        exampleNotifyFormDefinition
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({
        repeaterOptionName: [
          {
            repeaterComponentName: undefined,
            repeaterComponentDate: undefined
          },
          {
            repeaterComponentName: 'Gandalf',
            repeaterComponentDate: undefined
          }
        ]
      })

      processRepeaterEntries(
        message,
        exampleNotifyFormDefinition,
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([
        '# Team Member 2\n',
        "## What is the team member\\'s name?\n",
        'Gandalf\n'
      ])
    })

    it('should store an empty list when the repeater holds no items', () => {
      const { formModel, translator } = buildModelAndTranslator(
        exampleNotifyFormDefinition
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({ repeaterOptionName: [] })

      processRepeaterEntries(
        message,
        exampleNotifyFormDefinition,
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([])
    })

    it('should ignore guidance components that carry no title', () => {
      const guidanceComponent = /** @type {any} */ ({
        id: '4a2dc88c-be1a-4277-aff8-04220de2e778',
        name: 'guidanceComponent',
        type: ComponentType.Markdown,
        content: 'Some guidance',
        options: {}
      })
      const definition = buildDefinition({
        pages: [
          buildRepeaterPage({
            id: 'f227fb10-dcc8-4d49-9340-2fb138c642d9',
            title: 'Team member',
            path: '/team-member',
            components: [
              guidanceComponent,
              buildTextFieldComponent({
                title: "What is the team member's name?",
                name: 'repeaterComponentName',
                id: '32d6f10b-9a9e-4703-8452-dcb554ebf515'
              })
            ],
            repeat: {
              options: { name: 'repeaterOptionName', title: 'Team Member' },
              schema: { min: 1, max: 6 }
            }
          }),
          buildSummaryPage()
        ]
      })
      const { formModel, translator } = buildModelAndTranslator(definition)
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({
        repeaterOptionName: [
          {
            guidanceComponent: 'Some guidance',
            repeaterComponentName: 'Frodo'
          }
        ]
      })

      processRepeaterEntries(
        message,
        definition,
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([
        '# Team Member 1\n',
        "## What is the team member\\'s name?\n",
        'Frodo\n'
      ])
    })

    it('should ignore components missing from the form model', () => {
      const knownComponent = buildTextFieldComponent({
        title: "What is the team member's name?",
        name: 'repeaterComponentName',
        id: '32d6f10b-9a9e-4703-8452-dcb554ebf515'
      })
      const unknownComponent = buildTextFieldComponent({
        title: 'What is their nickname?',
        name: 'unknownComponentName',
        id: 'a8bd1de1-2b1e-4a4f-8f5e-2b3a4c5d6e7f'
      })

      /**
       * @param {ComponentDef[]} components
       */
      const definitionWith = (components) =>
        buildDefinition({
          engine: Engine.V2,
          schema: SchemaVersion.V2,
          pages: [
            buildRepeaterPage({
              id: 'f227fb10-dcc8-4d49-9340-2fb138c642d9',
              title: '',
              path: '/team-member',
              components,
              repeat: {
                options: { name: 'repeaterOptionName', title: 'Team Member' },
                schema: { min: 1, max: 6 }
              }
            }),
            buildSummaryPage()
          ]
        })

      // The model is built without the second component, so it has no field
      const { formModel, translator } = buildModelAndTranslator(
        definitionWith([knownComponent])
      )
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({
        repeaterOptionName: [
          {
            repeaterComponentName: 'Frodo',
            unknownComponentName: 'Mr Underhill'
          }
        ]
      })

      processRepeaterEntries(
        message,
        definitionWith([knownComponent, unknownComponent]),
        formModel,
        componentMap,
        translator
      )

      expect(componentMap.get('repeaterOptionName__answers')).toEqual([
        '# Team Member 1\n',
        "## What is the team member\\'s name?\n",
        'Frodo\n'
      ])
    })

    it('should escape content in the repeater title and question text', () => {
      const definition = buildDefinition({
        pages: [
          buildRepeaterPage({
            id: 'f227fb10-dcc8-4d49-9340-2fb138c642d9',
            title: 'Team member',
            path: '/team-member',
            components: [
              buildTextFieldComponent({
                title: '- Name of the team member',
                name: 'repeaterComponentName',
                id: '32d6f10b-9a9e-4703-8452-dcb554ebf515'
              })
            ],
            repeat: {
              options: { name: 'repeaterOptionName', title: '# Team Member' },
              schema: { min: 1, max: 6 }
            }
          }),
          buildSummaryPage()
        ]
      })
      const { formModel, translator } = buildModelAndTranslator(definition)
      const componentMap = /** @type {Map<string, string[]>} */ (new Map())
      const message = buildMessageWithRepeaters({
        repeaterOptionName: [{ repeaterComponentName: 'Frodo' }]
      })

      processRepeaterEntries(
        message,
        definition,
        formModel,
        componentMap,
        translator
      )

      const lines = componentMap.get('repeaterOptionName__answers')

      expect(lines?.[0]).toBe(String.raw`# \# Team Member 1` + '\n')
      expect(lines?.[1]).toBe(String.raw`## \- Name of the team member` + '\n')
    })
  })
})

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { FormAdapterSubmissionMessage } from '@defra/forms-engine-plugin/engine/types.js'
 * @import { FormDefinition } from '@defra/forms-model'
 */
