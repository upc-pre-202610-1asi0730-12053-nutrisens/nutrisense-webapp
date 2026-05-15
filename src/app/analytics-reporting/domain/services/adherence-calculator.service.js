import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/**
 * @param {string[]} logDates - YYYY-MM-DD (may contain duplicates)
 * @param {number} days - period length in days
 * @returns {number} adherence rate 0–1
 */
export function calculateAdherenceRate(logDates, days) {
  const now = new Date()
  const today = toLocalDateString(now)
  const startDate = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)))
  const daysWithLogs = new Set(logDates.filter(d => d >= startDate && d <= today)).size
  return daysWithLogs / days
}

/**
 * @param {string[]} logDates
 * @returns {number} 0–1
 */
export function weeklyAdherenceRate(logDates) {
  return calculateAdherenceRate(logDates, 7)
}

/**
 * @param {string[]} logDates
 * @returns {number} 0–1
 */
export function monthlyAdherenceRate(logDates) {
  return calculateAdherenceRate(logDates, 30)
}
