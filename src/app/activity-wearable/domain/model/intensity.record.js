/** @typedef {'low' | 'medium' | 'high'} IntensityValue */

export const LOW = 'low'
export const MODERATE = 'medium'
export const HIGH = 'high'

const VALID = new Set([LOW, MODERATE, HIGH])

/** @param {IntensityValue} value */
export function Intensity(value) {
  if (!VALID.has(value)) throw new Error(`Invalid intensity: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isHigh() { return value === HIGH },
    /** @returns {boolean} */
    isLow() { return value === LOW },
  })
}
