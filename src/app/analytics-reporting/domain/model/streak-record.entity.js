/**
 * @typedef {Object} StreakRecordProps
 * @property {number} currentStreak - consecutive days with at least one nutrition log
 * @property {number} longestStreak
 * @property {string|null} lastLogDate - YYYY-MM-DD
 * @property {number} weeklyCompletionRate - 0 to 1
 * @property {boolean[]} weeklyCompletionDays - 7 booleans Mon–Sun for the current week
 */

const MESSAGE_KEYS = {
  broken: 'streak.start_fresh',
  low: 'streak.keep_going',
  medium: 'streak.impressive',
  high: 'streak.unstoppable',
}

import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/** @param {StreakRecordProps} props */
export function StreakRecord(props) {
  const now = new Date()
  const today = toLocalDateString(now)
  const yesterday = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

  return Object.freeze({
    currentStreak: props.currentStreak,
    longestStreak: props.longestStreak,
    lastLogDate: props.lastLogDate,
    weeklyCompletionRate: props.weeklyCompletionRate,
    weeklyCompletionDays: props.weeklyCompletionDays ?? Array(7).fill(false),

    /** @returns {boolean} */
    isBroken() { return props.currentStreak === 0 },
    /** At risk if last log was yesterday with no log today. */
    isAtRisk() {
      return props.currentStreak > 0 && props.lastLogDate === yesterday
    },
    /** @returns {boolean} */
    isActiveToday() { return props.lastLogDate === today },
    /** @returns {string} i18n key for motivational message */
    motivationalMessageKey() {
      if (props.currentStreak === 0) return MESSAGE_KEYS.broken
      if (props.currentStreak < 7) return MESSAGE_KEYS.low
      if (props.currentStreak < 30) return MESSAGE_KEYS.medium
      return MESSAGE_KEYS.high
    },
    /** @returns {number} percentage 0–100 */
    weeklyCompletionPercent() { return Math.round(props.weeklyCompletionRate * 100) },
  })
}
