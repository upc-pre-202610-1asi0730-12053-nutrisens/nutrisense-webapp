import { ActivityType } from './activity-type.record.js'
import { Intensity } from './intensity.record.js'
import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/**
 * @typedef {Object} ActivityLogProps
 * @property {string} id
 * @property {string} userId
 * @property {string} date - YYYY-MM-DD
 * @property {import('./activity-type.record.js').ActivityTypeValue} activityType
 * @property {number} durationMinutes
 * @property {import('./intensity.record.js').IntensityValue} intensity
 * @property {number} caloriesBurned
 * @property {'manual' | 'google-health' | 'google-fit'} source
 * @property {string} loggedAt - ISO datetime
 */

/** @param {ActivityLogProps} props */
export function ActivityLog(props) {
  const activityType = ActivityType(props.activityType)
  const intensity = Intensity(props.intensity)

  return Object.freeze({
    id: props.id,
    userId: props.userId,
    date: props.date,
    activityType,
    durationMinutes: props.durationMinutes,
    intensity,
    caloriesBurned: props.caloriesBurned,
    source: props.source,
    loggedAt: props.loggedAt,

    /** @returns {boolean} high intensity OR high-intensity activity type */
    isHighIntensity() {
      return intensity.isHigh() || activityType.triggersPostWorkoutBanner()
    },
    /**
     * @param {Date} [now=new Date()]
     * @returns {number}
     */
    minutesSinceLogged(now = new Date()) {
      return Math.floor((now.getTime() - new Date(props.loggedAt).getTime()) / 60_000)
    },
    /**
     * Post-workout nutrition window is 2 hours from log time.
     * @param {Date} [now=new Date()]
     * @returns {boolean}
     */
    isInPostWorkoutWindow(now = new Date()) {
      return this.isHighIntensity() && this.minutesSinceLogged(now) <= 120
    },
    /** @returns {boolean} */
    isToday() { return props.date === toLocalDateString() },
  })
}
