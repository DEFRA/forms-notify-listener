import { escapeRegExp, hasStringValue } from '~/src/helpers/string-utils.js'

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
      expect(hasStringValue({})).toBe(false)
    })
    test('should return false if undefined', () => {
      expect(hasStringValue(undefined)).toBe(false)
    })
    test('should return false if empty string', () => {
      expect(hasStringValue('')).toBe(false)
    })
    test('should return true if non-empty string', () => {
      expect(hasStringValue('a')).toBe(true)
    })
  })
})
