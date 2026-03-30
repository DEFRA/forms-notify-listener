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

/**
 * Helper for validating the presence of strings during unit tests
 * @param {string} str - string to search within
 * @param {number} pos - position to start the search from
 * @param {string} findStr - string to be found
 */
export function stringExistsFromPosition(str, pos, findStr) {
  const findPos = str.indexOf(findStr, pos)
  if (findPos === -1) {
    throw new Error(`String not found '${findStr}'`)
  }
  return findPos + findStr.length
}
