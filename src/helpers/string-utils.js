/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {any} str - The string to examine
 */
export function hasStringValue(str) {
  if (typeof str !== 'string') {
    return false
  }

  return str !== ''
}
