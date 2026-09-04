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

/**
 * Safely extracts error details from unknown error types, if there are any
 * @param {unknown} error - The error to extract message from
 * @returns {string} The error details
 */
export function getErrorDetails(error) {
  if (
    error instanceof Error &&
    'data' in error &&
    error.data &&
    // @ts-expect-error - dynamic error object
    'errors' in error.data
  ) {
    return (
      // @ts-expect-error - dynamic error object
      error.data.errors
        // @ts-expect-error - dynamic error object
        .map((err) => `error: ${err.error} message: ${err.message}`)
        .join(' - ')
    )
  }
  return ''
}
