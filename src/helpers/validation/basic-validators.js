/**
 * Checks if a value is a string.
 * @param {unknown} value - The value to check.
 * @returns {value is string} True if the value is a string.
 */
export const isString = (value) => typeof value === 'string'

/**
 * Checks if a value is a non-empty string.
 * @param {unknown} value - The value to check.
 * @returns {value is string} True if the value is a non-empty string.
 */
export const isNonEmptyString = (value) => isString(value) && value.length > 0

/**
 * Checks if a value is undefined or null.
 * @param {unknown} value - The value to check.
 * @returns {value is undefined | null} True if the value is undefined or null.
 */
export const isUndefinedOrNull = (value) =>
  value === undefined || value === null

export default {
  isString,
  isNonEmptyString,
  isUndefinedOrNull
}
