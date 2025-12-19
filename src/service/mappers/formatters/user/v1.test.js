import {
  buildDefinition,
  buildFileUploadComponent,
  buildFileUploadPage,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import { buildFormAdapterSubmissionMessage } from '~/src/service/__stubs__/event-builders.js'
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
      const output = formatter(exampleNotifyFormMessage, definition)

      // Questions should use heading level 1 (#)
      expect(output).toContain('# What is your name?')
      expect(output).toContain('# What is your address?')
      expect(output).toContain('# What is your date of birth?')
      expect(output).toContain('# Who are your favourite LotR characters?')
    })

    it('should include answers below questions', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      expect(output).toContain('# What is your name?\n\nSomeone')
      expect(output).toContain('1 January 2000')
      expect(output).toContain('August 2025')
    })

    it('should use bullet points for checkbox answers', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // Checkboxes should have bullet points
      expect(output).toContain('* Gandalf')
      expect(output).toContain('* Frodo')
    })

    it('should not use bullet points for single radio answer', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const output = formatter(pizzaMessage, definition)

      // Radio buttons with single selection should NOT have bullet points
      expect(output).toContain('Delivery')
      expect(output).not.toContain('* Delivery')
    })

    it('should skip optional questions with no answer', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

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
      const output = formatter(messageWithOptionalAnswer, definition)

      // The optional field with an answer should be included
      expect(output).toContain('# Additional details')
      expect(output).toContain('Some additional details provided')
    })

    it('should show only file names for uploaded files (no links)', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // File uploads should show file names with bullet points, not links
      expect(output).toContain('* supporting\\_evidence\\.pdf')
      // Should NOT contain download links
      expect(output).not.toContain('file-download')
      expect(output).not.toContain('http://designer')
    })

    it('should format repeater sections with heading level 1 for main title', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // Repeater title should be heading level 1
      expect(output).toContain('# Team Member')
    })

    it('should format repeater items with heading level 2', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // Repeater items should be heading level 2
      expect(output).toContain('## Team Member 1')
      expect(output).toContain('## Team Member 2')
    })

    it('should include repeater item answers', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // Repeater answers should be included
      expect(output).toContain('Frodo')
      expect(output).toContain('Gandalf')
      expect(output).toContain('1 January 2000')
      expect(output).toContain('1 January 2020')
    })

    it('should not generate CSV download links for repeaters', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      // Should NOT contain CSV download links
      expect(output).not.toContain('Download')
      expect(output).not.toContain('CSV')
    })

    it('should format UK addresses correctly', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      expect(output).toContain('1 Anywhere Street')
      expect(output).toContain('Anywhereville')
      expect(output).toContain('Anywhereshire')
      expect(output).toContain('AN1 2WH')
    })

    it('should preserve multiline text field formatting', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const output = formatter(pizzaMessage, definition)

      // Multiline text should preserve line breaks
      expect(output).toContain('Line 1\nLine 2\nLine 3')
    })

    it('should maintain component order from form definition', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

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
      const output = formatter(exampleNotifyFormMessage, definition)

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
      const output = formatter(emptyMessage, definition)

      // Should return empty or minimal output
      expect(output).toBe('')
    })

    it('should match snapshot for standard form', () => {
      const definition = buildDefinition(exampleNotifyFormDefinition)
      const output = formatter(exampleNotifyFormMessage, definition)

      expect(output).toMatchSnapshot()
    })

    it('should match snapshot for pizza form', () => {
      const definition = buildDefinition(pizzaFormDefinition)
      const output = formatter(pizzaMessage, definition)

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
      const output = formatter(messageWithUndefined, definition)

      expect(output).not.toContain('# Additional details')
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

      const output = formatter(messageWithEmptyFile, definitionWithOptionalFile)

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
      const output = formatter(messageWithNullRepeaterValue, definition)

      // Should include the first item
      expect(output).toContain('## Team Member 1')
      expect(output).toContain('Frodo')
      // Should skip items with null/empty name but still show date
      expect(output).toContain('## Team Member 2')
      expect(output).toContain('1 January 2020')
      expect(output).toContain('## Team Member 3')
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
      const output = formatter(messageWithUnknownKey, definition)

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
      const output = formatter(messageWithUnknownRepeater, definition)

      // Should not crash and should still format known repeaters
      expect(output).toContain('## Team Member 1')
      expect(output).toContain('Frodo')
    })
  })

  describe('legacy V1 engine forms', () => {
    it('should format legacy V1 forms correctly', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const output = formatter(legacyGraphFormMessage, definition)

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
      const output = formatter(legacyGraphFormMessage, definition)

      // Should include repeater data
      expect(output).toContain('## person 1')
      expect(output).toContain('Jane')
      expect(output).toContain('## person 2')
      expect(output).toContain('Janet')
    })

    it('should handle legacy V1 form file uploads', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const output = formatter(legacyGraphFormMessage, definition)

      // Should include file upload without links
      expect(output).toContain('bank\\_statement\\.pdf')
      expect(output).not.toContain('http://localhost')
    })

    it('should handle legacy V1 form radio selections', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const output = formatter(legacyGraphFormMessage, definition)

      // Should include radio selection
      expect(output).toContain('# Country of birth')
      expect(output).toContain('England')
    })

    it('should match snapshot for legacy V1 form', () => {
      const definition = buildDefinition(legacyGraphFormDefinition)
      const output = formatter(legacyGraphFormMessage, definition)

      expect(output).toMatchSnapshot()
    })
  })
})
