/** @typedef {'metric' | 'imperial'} PreferredUnitsValue */

export const METRIC = 'metric'
export const IMPERIAL = 'imperial'

const VALID = new Set([METRIC, IMPERIAL])

/** @param {PreferredUnitsValue} value */
export function PreferredUnits(value) {
  if (!VALID.has(value)) throw new Error(`Invalid preferred units: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isMetric() { return value === METRIC },
    /** @returns {boolean} */
    isImperial() { return value === IMPERIAL },
    /** @returns {'kg' | 'lb'} */
    weightUnit() { return value === METRIC ? 'kg' : 'lb' },
    /** @returns {'cm' | 'ft'} */
    heightUnit() { return value === METRIC ? 'cm' : 'ft' },
  })
}
