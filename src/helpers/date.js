import { enGB } from 'date-fns/locale/en-GB'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Format a date in local timezone (Europe/London) and locale (enGB)
 * @param {Date} date
 * @param {string} formatStr
 */
export function format(date, formatStr) {
  return formatInTimeZone(date, 'Europe/London', formatStr, {
    locale: enGB
  })
}
