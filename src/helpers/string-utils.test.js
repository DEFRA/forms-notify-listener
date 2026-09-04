import {
  escapeRegExp,
  getErrorDetails,
  stringHasNonEmptyValue
} from '~/src/helpers/string-utils.js'

describe('String Utils', () => {
  describe('escapeRegExp', () => {
    const testCases = [
      {
        input: 'hello world',
        expected: 'hello world',
        description: 'should not modify strings without special characters'
      },
      {
        input: '.*+?^${}()|[]\\',
        expected: '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
        description: 'should escape all special regex characters'
      },
      {
        input: 'user.input*with^special$chars',
        expected: 'user\\.input\\*with\\^special\\$chars',
        description: 'should escape special characters within regular text'
      },
      {
        input: '',
        expected: '',
        description: 'should handle empty strings'
      },
      {
        input: '\\already\\escaped\\',
        expected: '\\\\already\\\\escaped\\\\',
        description: 'should escape backslashes'
      }
    ]

    test.each(testCases)('$description', ({ input, expected }) => {
      expect(escapeRegExp(input)).toBe(expected)
    })
  })

  describe('hasStringValue', () => {
    test('should return false if not a string', () => {
      // @ts-expect-error - invalid type for test call
      expect(stringHasNonEmptyValue({})).toBe(false)
    })
    test('should return false if undefined', () => {
      // @ts-expect-error - invalid type for test call
      expect(stringHasNonEmptyValue(undefined)).toBe(false)
    })
    test('should return false if empty string', () => {
      expect(stringHasNonEmptyValue('')).toBe(false)
    })
    test('should return true if non-empty string', () => {
      expect(stringHasNonEmptyValue('a')).toBe(true)
    })
  })

  describe('getErrorDetails', () => {
    test('should handle no details', () => {
      expect(getErrorDetails({})).toBe('')
    })
    test('should handle error.data = null', () => {
      const error = new Error('test error')
      // @ts-expect-error - dynamic error object
      error.data = null
      expect(getErrorDetails(error)).toBe('')
    })
    test('should handle single error details', () => {
      const error = new Error('test error')
      // @ts-expect-error - dynamic error object
      error.data = {
        errors: [{ error: 'err1', message: 'message1' }]
      }
      expect(getErrorDetails(error)).toBe('error: err1 message: message1')
    })

    test('should handle multiple error details', () => {
      const error = new Error('test error')
      // @ts-expect-error - dynamic error object
      error.data = {
        errors: [
          { error: 'err1', message: 'message1' },
          { error: 'err2', message: 'message2' }
        ]
      }
      expect(getErrorDetails(error)).toBe(
        'error: err1 message: message1 - error: err2 message: message2'
      )
    })
  })
})
