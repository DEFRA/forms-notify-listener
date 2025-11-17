/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {string} str - The string to examine
 * @returns {boolean}
 */
export function stringHasNonEmptyValue(str) {
  if (typeof str !== 'string') {
    return false
  }

  return str !== ''
}
