/** @typedef {'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extra-active'} ActivityLevelValue */

export const SEDENTARY = 'sedentary'
export const LIGHTLY_ACTIVE = 'lightly-active'
export const MODERATELY_ACTIVE = 'moderately-active'
export const VERY_ACTIVE = 'very-active'
export const EXTRA_ACTIVE = 'extra-active'

/** Harris-Benedict PAL multipliers */
const PAL = {
  [SEDENTARY]: 1.2,
  [LIGHTLY_ACTIVE]: 1.375,
  [MODERATELY_ACTIVE]: 1.55,
  [VERY_ACTIVE]: 1.725,
  [EXTRA_ACTIVE]: 1.9,
}

/** @param {ActivityLevelValue} value */
export function ActivityLevel(value) {
  if (!(value in PAL)) throw new Error(`Invalid activity level: ${value}`)
  return Object.freeze({
    value,
    /** @returns {number} PAL multiplier used in TDEE calculation */
    palMultiplier() { return PAL[value] },
    /** @returns {boolean} */
    isSedentary() { return value === SEDENTARY },
  })
}
