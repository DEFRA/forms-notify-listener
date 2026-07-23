import { cy, enGB } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Format a date in local timezone (Europe/London) and locale (enGB)
 * @param {Date} date
 * @param {string} formatStr
 * @param {string} [language]
 */
export function format(date, formatStr, language) {
  return formatInTimeZone(date, 'Europe/London', formatStr, {
    locale: language === 'cy' ? cy : enGB
  })
}
