// PATH: src/app/shared/infrastructure/date-utils.js

/**
 * Returns a YYYY-MM-DD string in **local** time for the given date.
 * Avoids timezone-offset bugs from `toISOString()`, which always returns UTC
 * and shifts the date when the local offset puts the clock past midnight UTC.
 * @param {Date} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function toLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
