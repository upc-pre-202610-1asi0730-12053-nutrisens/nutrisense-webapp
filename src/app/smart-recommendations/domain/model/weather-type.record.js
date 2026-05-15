/** @typedef {'hot' | 'warm' | 'mild' | 'cold'} WeatherTypeValue */

export const HOT = 'hot'
export const WARM = 'warm'
export const MILD = 'mild'
export const COLD = 'cold'

const VALID = new Set([HOT, WARM, MILD, COLD])

/** @param {WeatherTypeValue} value */
export function WeatherType(value) {
  if (!VALID.has(value)) throw new Error(`Invalid weather type: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isHot() { return value === HOT },
    /** @returns {boolean} */
    isCold() { return value === COLD },
    /** Hot/warm weather → recommend cold or fresh dishes. */
    prefersColdDishes() { return value === HOT || value === WARM },
    /** Cold/mild weather → recommend warm or hearty dishes. */
    prefersHotDishes() { return value === COLD || value === MILD },
  })
}
