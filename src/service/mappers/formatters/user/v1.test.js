import { randomUUID } from 'node:crypto'

import { FormModel } from '@defra/forms-engine-plugin/engine/models/FormModel.js'
import {
  buildDefinition,
  buildFileUploadComponent,
  buildFileUploadPage,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import { EN_GB } from '~/src/i18n/translations-helper.js'
import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
import {
  legacyGraphFormDefinition,
  legacyGraphFormMessage
} from '~/src/service/mappers/formatters/__stubs__/legacy-form.js'
import {
  declarationFormDefinition,
  declarationMessage,
  exampleNotifyFormDefinition,
  exampleNotifyFormMessage,
  geospatialFormDefinition,
  geospatialMessage,
  pizzaFormDefinition,
  pizzaMessage,
  yesNoFormDefinition,
  yesNoMessage
} from '~/src/service/mappers/formatters/__stubs__/notify.js'
import { formatter } from '~/src/service/mappers/formatters/user/v1.js'

jest.mock('nunjucks', () => {
  const environment = {
    addFilter: jest.fn(),
    addGlobal: jest.fn()
  }
  return {
    configure: jest.fn(() => environment)
  }
})

describe('User answers formatter v1', () => {
  describe('formatter', () => {
    it('should return questions with heading level 1', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Questions should use heading level 1 (#)
      expect(output).toContain('# What is your name?')
      expect(output).toContain('# What is your address?')
      expect(output).toContain('# What is your date of birth?')
      expect(output).toContain('# Who are your favourite LotR characters?')
    })

    it('should include answers below questions', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      expect(output).toContain('# What is your name?\n\nSomeone')
      expect(output).toContain('1 January 2000')
      expect(output).toContain('August 2025')
    })

    it('should use bullet points for checkbox answers', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Checkboxes should have bullet points
      expect(output).toContain('* Gandalf')
      expect(output).toContain('* Frodo')
    })

    it('should not use bullet points for single radio answer', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(pizzaMessage, definition, translator)

      // Radio buttons with single selection should NOT have bullet points
      expect(output).toContain('Delivery')
      expect(output).not.toContain('* Delivery')
    })

    it('should skip optional questions with no answer', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // The "Additional details" field is optional and has null value
      // It should NOT appear in the output
      expect(output).not.toContain('# Additional details')
    })

    it('should include optional questions that have been answered', () => {
      const messageWithOptionalAnswer = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          main: {
            ...exampleNotifyFormMessage.data.main,
            ADDDTS: 'Some additional details provided'
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithOptionalAnswer,
        definition,
        translator
      )

      // The optional field with an answer should be included
      expect(output).toContain('# Additional details')
      expect(output).toContain('Some additional details provided')
    })

    it('should show only file names for uploaded files (no links)', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // File uploads should show file names (no bullet for single file, bullets for multiple)
      expect(output).toContain('supporting_evidence.pdf')
      // Should NOT contain download links
      expect(output).not.toContain('file-download')
      expect(output).not.toContain('http://designer')
    })

    it('should format repeater items with heading level 1 for the item label', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Repeater items should be heading level 1
      expect(output).toContain('# Team Member 1')
      expect(output).toContain('# Team Member 2')
    })

    it('should format repeater questions with heading level 2 beneath each item', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Every question of an item is grouped beneath that item's heading
      expect(output).toContain(
        `# Team Member 1

## What is the team member\\'s name?

Frodo

## What is the team member\\'s date of birth?

1 January 2000`
      )
    })

    it('should include repeater item answers', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Repeater answers should be included
      expect(output).toContain('Frodo')
      expect(output).toContain('Gandalf')
      expect(output).toContain('1 January 2000')
      expect(output).toContain('1 January 2020')
    })

    it('should not generate CSV download links for repeaters', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Should NOT contain CSV download links
      expect(output).not.toContain('Download')
      expect(output).not.toContain('CSV')
    })

    it('should format UK addresses correctly', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      expect(output).toContain('1 Anywhere Street')
      expect(output).toContain('Anywhereville')
      expect(output).toContain('Anywhereshire')
      expect(output).toContain('AN1 2WH')
    })

    it('should preserve multiline text field formatting', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(pizzaMessage, definition, translator)

      // Multiline text should preserve line breaks
      expect(output).toContain('Line 1\nLine 2\nLine 3')
    })

    it('should handle multiline text with triple backticks', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(pizzaMessage, definition, translator)

      // Multiline text with triple backticks should have them escaped to prevent Notify markdown interpretation
      expect(output).toContain('Line 1\n` ` `\nLine 2\n` ` `\nLine 3')
    })

    it('should handle yes/no field formatting', () => {
      const definition = buildDefinition(yesNoFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(yesNoMessage, definition, translator)

      // Multiline text should preserve line breaks
      expect(output).toContain('# YesNo Field Component\n\nYes')
    })

    it('should maintain component order from form definition', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Check that questions appear in the correct order
      const nameIndex = output.indexOf('# What is your name?')
      const addressIndex = output.indexOf('# What is your address?')
      const dobIndex = output.indexOf('# What is your date of birth?')
      const monthIndex = output.indexOf('# What month is it?')
      const charactersIndex = output.indexOf(
        '# Who are your favourite LotR characters?'
      )

      expect(nameIndex).toBeLessThan(addressIndex)
      expect(addressIndex).toBeLessThan(dobIndex)
      expect(dobIndex).toBeLessThan(monthIndex)
      expect(monthIndex).toBeLessThan(charactersIndex)
    })

    it('should not include internal email elements', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      // Should NOT contain elements from internal email
      expect(output).not.toContain('Thanks,')
      expect(output).not.toContain('Defra')
      expect(output).not.toContain('For security reasons')
      expect(output).not.toContain('expire')
      expect(output).not.toContain('form received at')
    })

    it('should handle empty form submission data', () => {
      const emptyMessage = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {},
          repeaters: {},
          files: {}
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(emptyMessage, definition, translator)

      // Should return empty or minimal output
      expect(output).toBe('')
    })

    it('should match snapshot for standard form', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(exampleNotifyFormMessage, definition, translator)

      expect(output).toMatchSnapshot()
    })

    it('should match snapshot for pizza form', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      // For translation tests, we must ensure the component id's are unique otherwise we'll get collisions
      definition.pages.forEach((p) => {
        if ('components' in p) {
          p.components?.forEach((comp) => {
            comp.id = randomUUID()
          })
        }
      })
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(pizzaMessage, definition, translator)

      expect(output).toMatchSnapshot()
    })

    it('should skip optional fields with undefined value', () => {
      const messageWithUndefined = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          main: {
            ...exampleNotifyFormMessage.data.main,
            ADDDTS: undefined
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithUndefined, definition, translator)

      expect(output).not.toContain('# Additional details')
    })

    it('should skip optional fields whose display string is empty', () => {
      // An empty string survives the null/undefined check, so the field is only
      // dropped once its display string turns out to be empty too
      const messageWithEmptyString = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          main: {
            ...exampleNotifyFormMessage.data.main,
            ADDDTS: ''
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithEmptyString, definition, translator)

      expect(output).not.toContain('# Additional details')
      // The rest of the form is unaffected
      expect(output).toContain('# What is your name?')
    })

    it('should skip optional file upload fields with empty array', () => {
      const definitionWithOptionalFile = buildDefinition({
        ...exampleNotifyFormDefinition,
        pages: [
          buildQuestionPage({
            title: '',
            path: '/name',
            components: [
              buildTextFieldComponent({
                title: 'Your name',
                name: 'nameField',
                options: { required: true }
              })
            ]
          }),
          buildFileUploadPage({
            title: '',
            path: '/optional-file',
            components: [
              buildFileUploadComponent({
                title: 'Optional document',
                name: 'optionalFile',
                options: { required: false }
              })
            ]
          }),
          buildSummaryPage({
            title: 'Summary',
            path: '/summary'
          })
        ]
      })

      const messageWithEmptyFile = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {
            nameField: 'Test User'
          },
          repeaters: {},
          files: {
            optionalFile: []
          }
        }
      })

      const formModel = new FormModel(definitionWithOptionalFile, {
        basePath: '/'
      })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithEmptyFile,
        definitionWithOptionalFile,
        translator
      )

      expect(output).toContain('# Your name')
      expect(output).toContain('Test User')
      expect(output).not.toContain('# Optional document')
    })

    it('should skip repeater items with null or empty values', () => {
      const messageWithNullRepeaterValue = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          repeaters: {
            repeaterOptionName: [
              {
                repeaterComponentName: 'Frodo',
                repeaterComponentDate: { day: 1, month: 1, year: 2000 }
              },
              {
                // @ts-expect-error - intentionally testing null handling
                repeaterComponentName: null,
                repeaterComponentDate: { day: 1, month: 1, year: 2020 }
              },
              {
                repeaterComponentName: '',
                repeaterComponentDate: { day: 1, month: 1, year: 2021 }
              }
            ]
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithNullRepeaterValue,
        definition,
        translator
      )

      // Should include the first item
      expect(output).toContain('# Team Member 1')
      expect(output).toContain('Frodo')
      // Should skip items with null/empty name but still show date
      expect(output).toContain('# Team Member 2')
      expect(output).toContain('1 January 2020')
      expect(output).toContain('# Team Member 3')
      expect(output).toContain('1 January 2021')
    })

    it('should handle data with unknown component keys gracefully', () => {
      const messageWithUnknownKey = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {
            ...exampleNotifyFormMessage.data.main,
            unknownComponentKey: 'Some value'
          },
          repeaters: exampleNotifyFormMessage.data.repeaters,
          files: exampleNotifyFormMessage.data.files
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithUnknownKey, definition, translator)

      // Should not include unknown component
      expect(output).not.toContain('unknownComponentKey')
      expect(output).not.toContain('Some value')
      // Should still include known components
      expect(output).toContain('# What is your name?')
    })

    it('should handle repeaters with unknown keys gracefully', () => {
      const messageWithUnknownRepeater = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: exampleNotifyFormMessage.data.main,
          repeaters: {
            ...exampleNotifyFormMessage.data.repeaters,
            unknownRepeaterKey: [{ someField: 'value' }]
          },
          files: exampleNotifyFormMessage.data.files
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithUnknownRepeater,
        definition,
        translator
      )

      // Should not crash and should still format known repeaters
      expect(output).toContain('# Team Member 1')
      expect(output).toContain('Frodo')
    })

    it('should handle repeater pages with guidance components', () => {
      const definitionWithRepeaterGuidance =
        /** @type {import('@defra/forms-model').FormDefinition} */ ({
          name: 'Form with repeater guidance',
          pages: [
            {
              title: 'Team members',
              path: '/team-members',
              components: [
                {
                  id: 'bac683ce-149e-4740-95aa-8289b35bc327',
                  options: {},
                  content: 'Some guidance content.',
                  type: 'Markdown'
                },
                {
                  id: '407dd0d7-cce9-4f43-8e1f-7d89cb698875',
                  name: 'teamMemberName',
                  title: 'Name of team member',
                  hint: '',
                  options: {
                    required: true
                  },
                  schema: {},
                  type: 'TextField'
                }
              ],
              next: [],
              id: '32888028-61db-40fc-b255-80bc67829d31',
              repeat: {
                options: {
                  name: 'teamMembers',
                  title: 'Team member'
                },
                schema: {
                  min: 1,
                  max: 5
                }
              },
              controller: 'RepeatPageController'
            },
            {
              id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
              title: 'Summary',
              path: '/summary',
              controller: 'SummaryPageController'
            }
          ],
          conditions: [],
          sections: [],
          lists: [],
          startPage: '/team-members'
        })

      const messageWithRepeaterGuidance = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {},
          repeaters: {
            teamMembers: [
              { teamMemberName: 'Alice' },
              { teamMemberName: 'Bob' }
            ]
          },
          files: {}
        }
      })

      const formModel = new FormModel(definitionWithRepeaterGuidance, {
        basePath: '/'
      })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithRepeaterGuidance,
        definitionWithRepeaterGuidance,
        translator
      )

      // Should include the team member names
      expect(output).toContain('## Name of team member')
      expect(output).toContain('# Team member 1')
      expect(output).toContain('Alice')
      expect(output).toContain('# Team member 2')
      expect(output).toContain('Bob')
      // Should NOT include the guidance component content
      expect(output).not.toContain(
        'Please enter the details for each team member.'
      )
    })

    it('should handle geospatial fields', () => {
      const definition = geospatialFormDefinition
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(geospatialMessage, definition, translator)

      expect(output).toBe(`# Geospatial features of the site

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
-0.1408908761094949, 51.50022866765107`)
    })

    it('should handle declaration fields -  english accepted', () => {
      const definition = declarationFormDefinition
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(declarationMessage, definition, translator)

      expect(output).toBe(`# Declaration

I understand and agree`)
    })

    it('should handle declaration fields -  english not provided', () => {
      const definition = declarationFormDefinition
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const declarationMessageLocal = structuredClone(declarationMessage)
      declarationMessageLocal.data.main.DeclarationField = 'false'
      const output = formatter(declarationMessageLocal, definition, translator)

      expect(output).toBe(`# Declaration

Not provided`)
    })
    it('should drop repeater items where no component holds a value', () => {
      const messageWithEmptyItem = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          repeaters: {
            repeaterOptionName: [
              {
                // @ts-expect-error - intentionally testing null handling
                repeaterComponentName: null,
                // @ts-expect-error - intentionally testing null handling
                repeaterComponentDate: null
              },
              {
                repeaterComponentName: 'Gandalf',
                repeaterComponentDate: { day: 1, month: 1, year: 2020 }
              }
            ]
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithEmptyItem, definition, translator)

      // The first item holds nothing, so its heading is dropped entirely
      expect(output).not.toContain('# Team Member 1')
      expect(output).toContain('# Team Member 2')
      expect(output).toContain('Gandalf')
    })

    it('should skip repeater pages that carry no components', () => {
      const definitionWithoutComponents =
        /** @type {import('@defra/forms-model').FormDefinition} */ ({
          name: 'Form with a component-less repeater',
          pages: [
            {
              title: 'Team members',
              path: '/team-members',
              // No `next` property, so the page reports no components
              id: '32888028-61db-40fc-b255-80bc67829d31',
              components: [
                {
                  id: '407dd0d7-cce9-4f43-8e1f-7d89cb698875',
                  name: 'teamMemberName',
                  title: 'Name of team member',
                  hint: '',
                  options: { required: true },
                  schema: {},
                  type: 'TextField'
                }
              ],
              repeat: {
                options: { name: 'teamMembers', title: 'Team member' },
                schema: { min: 1, max: 5 }
              },
              controller: 'RepeatPageController'
            },
            {
              id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
              title: 'Summary',
              path: '/summary',
              controller: 'SummaryPageController'
            }
          ],
          conditions: [],
          sections: [],
          lists: [],
          startPage: '/team-members'
        })

      const message = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {},
          repeaters: {
            teamMembers: [{ teamMemberName: 'Alice' }]
          },
          files: {}
        }
      })

      const formModel = new FormModel(definitionWithoutComponents, {
        basePath: '/'
      })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(message, definitionWithoutComponents, translator)

      expect(output).toBe('')
    })

    it('should ignore repeater components that are not form components', () => {
      const definitionWithDetails =
        /** @type {import('@defra/forms-model').FormDefinition} */ ({
          name: 'Form with repeater details',
          pages: [
            {
              title: 'Team members',
              path: '/team-members',
              components: [
                {
                  id: '245d54df-bb1e-488e-82f6-8f1e42c197e6',
                  name: 'teamMemberDetails',
                  // A Details component carries a title but holds no answer
                  title: 'More about team members',
                  content: 'Some guidance content.',
                  options: {},
                  type: 'Details'
                },
                {
                  id: '407dd0d7-cce9-4f43-8e1f-7d89cb698875',
                  name: 'teamMemberName',
                  title: 'Name of team member',
                  hint: '',
                  options: { required: true },
                  schema: {},
                  type: 'TextField'
                }
              ],
              next: [],
              id: '32888028-61db-40fc-b255-80bc67829d31',
              repeat: {
                options: { name: 'teamMembers', title: 'Team member' },
                schema: { min: 1, max: 5 }
              },
              controller: 'RepeatPageController'
            },
            {
              id: '449a45f6-4541-4a46-91bd-8b8931b07b50',
              title: 'Summary',
              path: '/summary',
              controller: 'SummaryPageController'
            }
          ],
          conditions: [],
          sections: [],
          lists: [],
          startPage: '/team-members'
        })

      const message = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          main: {},
          repeaters: {
            teamMembers: [{ teamMemberName: 'Alice' }]
          },
          files: {}
        }
      })

      const formModel = new FormModel(definitionWithDetails, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(message, definitionWithDetails, translator)

      expect(output).toContain('# Team member 1')
      expect(output).toContain('## Name of team member')
      expect(output).toContain('Alice')
      expect(output).not.toContain('More about team members')
    })

    it('should show the plain answer for a required file upload with no files', () => {
      const messageWithNoFiles = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          files: {
            IWEgMu: []
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithNoFiles, definition, translator)

      // The question is still listed because it is required, but has no answer
      expect(output).toContain('# Please add supporting evidence\n\n\n')
      expect(output).not.toContain('supporting_evidence.pdf')
    })

    it('should use bullet points when several files are uploaded', () => {
      const messageWithTwoFiles = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          files: {
            IWEgMu: [
              {
                fileName: 'supporting_evidence.pdf',
                fileId: 'ef4863e9-7e9e-40d0-8fea-cf34faf098cd',
                userDownloadLink:
                  'http://localhost:3005/file-download/ef4863e9-7e9e-40d0-8fea-cf34faf098cd'
              },
              {
                fileName: 'second_evidence.pdf',
                fileId: '0a0e3f6d-6f0b-4a1e-9c3b-1a0f2d6e8b7c',
                userDownloadLink:
                  'http://localhost:3005/file-download/0a0e3f6d-6f0b-4a1e-9c3b-1a0f2d6e8b7c'
              }
            ]
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(messageWithTwoFiles, definition, translator)

      expect(output).toContain('* supporting_evidence.pdf')
      expect(output).toContain('* second_evidence.pdf')
      // File names are listed without download links
      expect(output).not.toContain('http://localhost')
    })

    it('should leave the answer blank when no list item matches the value', () => {
      const messageWithUnknownListValue = buildFormAdapterSubmissionMessage({
        ...exampleNotifyFormMessage,
        data: {
          ...exampleNotifyFormMessage.data,
          main: {
            ...exampleNotifyFormMessage.data.main,
            hVcHQv: ['Sauron']
          }
        }
      })

      const definition = buildDefinition(exampleNotifyFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(
        messageWithUnknownListValue,
        definition,
        translator
      )

      // The question is still listed because it is required, but has no answer
      expect(output).toContain('# Who are your favourite LotR characters?')
      expect(output).not.toContain('Sauron')
      expect(output).not.toContain('* Gandalf')
    })
  })

  describe('legacy V1 engine forms', () => {
    it('should format legacy V1 forms correctly', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      // For translation tests, we must ensure the component id's are unique otherwise we'll get collisions
      definition.pages.forEach((p) => {
        if ('components' in p) {
          p.components?.forEach((comp) => {
            comp.id = randomUUID()
          })
        }
      })
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(legacyGraphFormMessage, definition, translator)

      // Should include main form fields
      expect(output).toContain('# First name')
      expect(output).toContain('John')
      expect(output).toContain('# Last name')
      expect(output).toContain('Doe')
      expect(output).toContain('# Your age')
      expect(output).toContain('4')
    })

    it('should handle legacy V1 form repeaters', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(legacyGraphFormMessage, definition, translator)

      // Should include repeater data
      expect(output).toContain('# person 1')
      expect(output).toContain('Jane')
      expect(output).toContain('# person 2')
      expect(output).toContain('Janet')
    })

    it('should handle legacy V1 form file uploads', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(legacyGraphFormMessage, definition, translator)

      // Should include file upload without links
      expect(output).toContain('bank_statement.pdf')
      expect(output).not.toContain('http://localhost')
    })

    it('should handle legacy V1 form radio selections', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(legacyGraphFormMessage, definition, translator)

      // Should include radio selection
      expect(output).toContain('# Country of birth')
      expect(output).toContain('England')
    })

    it('should match snapshot for legacy V1 form', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const formModel = new FormModel(definition, { basePath: '/' })
      const translator = formModel.createTranslator(EN_GB)
      const output = formatter(legacyGraphFormMessage, definition, translator)

      expect(output).toMatchSnapshot()
    })
  })
})
