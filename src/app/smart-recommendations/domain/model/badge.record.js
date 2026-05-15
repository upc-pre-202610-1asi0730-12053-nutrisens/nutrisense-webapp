/** @typedef {'light' | 'moderate' | 'heavy' | 'high-protein' | 'bulk' | 'post-workout' | 'local-dish'} BadgeValue */

export const LIGHT = 'light'
export const MODERATE = 'moderate'
export const HEAVY = 'heavy'
export const HIGH_PROTEIN = 'high-protein'
export const BULK = 'bulk'
export const POST_WORKOUT = 'post-workout'
export const LOCAL_DISH = 'local-dish'

const VALID = new Set([LIGHT, MODERATE, HEAVY, HIGH_PROTEIN, BULK, POST_WORKOUT, LOCAL_DISH])

/** @param {BadgeValue} value */
export function Badge(value) {
  if (!VALID.has(value)) throw new Error(`Invalid badge: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} suitable as a weight-loss focused label */
    isLowCalorieFocus() { return value === LIGHT || value === MODERATE },
    /** @returns {boolean} suitable as a muscle-gain focused label */
    isMuscleGainFocus() {
      return value === HIGH_PROTEIN || value === BULK || value === POST_WORKOUT
    },
    /** @returns {boolean} */
    isLocalDish() { return value === LOCAL_DISH },
  })
}
