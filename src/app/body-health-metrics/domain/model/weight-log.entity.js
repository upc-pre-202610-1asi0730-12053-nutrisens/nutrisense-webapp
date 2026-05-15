/**
 * @typedef {Object} WeightLogProps
 * @property {string} id
 * @property {string} userId
 * @property {number} weightKg
 * @property {string} loggedAt - ISO datetime
 * @property {string|null} note
 */

import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/** @param {WeightLogProps} props */
export function WeightLog(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    weightKg: props.weightKg,
    loggedAt: props.loggedAt,
    note: props.note,

    /** @returns {string} YYYY-MM-DD in local time */
    dateLabel() { return toLocalDateString(new Date(props.loggedAt)) },
    /** @returns {boolean} */
    isToday() { return this.dateLabel() === toLocalDateString() },
    /** @returns {boolean} */
    hasNote() { return props.note !== null && props.note !== '' },
  })
}
