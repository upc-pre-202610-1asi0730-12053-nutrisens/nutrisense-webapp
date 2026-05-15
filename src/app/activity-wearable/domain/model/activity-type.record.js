/**
 * @typedef {'walking'|'running'|'cycling'|'swimming'|'strength-training'|'hiit'|'cardio'|'yoga'|'pilates'|'rowing'|'elliptical'|'dance'|'boxing'} ActivityTypeValue
 */

export const WALKING = 'walking'
export const RUNNING = 'running'
export const CYCLING = 'cycling'
export const SWIMMING = 'swimming'
export const STRENGTH_TRAINING = 'strength-training'
export const HIIT = 'hiit'
export const CARDIO = 'cardio'
export const YOGA = 'yoga'
export const PILATES = 'pilates'
export const ROWING = 'rowing'
export const ELLIPTICAL = 'elliptical'
export const DANCE = 'dance'
export const BOXING = 'boxing'

const VALID = new Set([
  WALKING, RUNNING, CYCLING, SWIMMING, STRENGTH_TRAINING,
  HIIT, CARDIO, YOGA, PILATES, ROWING, ELLIPTICAL, DANCE, BOXING,
])

/** Types that trigger the post-workout nutrition banner in Muscle Gain mode. */
const POST_WORKOUT_TYPES = new Set([STRENGTH_TRAINING, HIIT, RUNNING, SWIMMING, BOXING])

/** Base kcal burned per minute at medium intensity for a ~70 kg person. */
const BASE_CALORIES_PER_MINUTE = Object.freeze({
  [WALKING]: 4,
  [RUNNING]: 10,
  [CYCLING]: 8,
  [SWIMMING]: 9,
  [STRENGTH_TRAINING]: 6,
  [HIIT]: 12,
  [CARDIO]: 9,
  [YOGA]: 3,
  [PILATES]: 4,
  [ROWING]: 10,
  [ELLIPTICAL]: 8,
  [DANCE]: 5,
  [BOXING]: 11,
})

const INTENSITY_MULTIPLIERS = Object.freeze({ low: 0.75, medium: 1.0, high: 1.3 })

/** @param {ActivityTypeValue} value */
export function ActivityType(value) {
  if (!VALID.has(value)) throw new Error(`Invalid activity type: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    triggersPostWorkoutBanner() { return POST_WORKOUT_TYPES.has(value) },
    /**
     * Estimates calories burned based on intensity and duration.
     * @param {'low'|'medium'|'high'} intensityValue
     * @param {number} durationMinutes
     * @returns {number}
     */
    estimateCalories(intensityValue, durationMinutes) {
      const multiplier = INTENSITY_MULTIPLIERS[intensityValue] ?? 1.0
      return Math.round(BASE_CALORIES_PER_MINUTE[value] * multiplier * durationMinutes)
    },
  })
}
