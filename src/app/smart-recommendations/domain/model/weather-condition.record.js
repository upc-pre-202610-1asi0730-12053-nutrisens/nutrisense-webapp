/** @typedef {'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'snowy'} WeatherConditionValue */

export const SUNNY = 'sunny'
export const PARTLY_CLOUDY = 'partly-cloudy'
export const CLOUDY = 'cloudy'
export const RAINY = 'rainy'
export const STORMY = 'stormy'
export const SNOWY = 'snowy'

const VALID = new Set([SUNNY, PARTLY_CLOUDY, CLOUDY, RAINY, STORMY, SNOWY])

/** @param {WeatherConditionValue} value */
export function WeatherCondition(value) {
  if (!VALID.has(value)) throw new Error(`Invalid weather condition: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isSunny() { return value === SUNNY },
    /** @returns {boolean} */
    isPrecipitating() { return value === RAINY || value === STORMY || value === SNOWY },
  })
}
