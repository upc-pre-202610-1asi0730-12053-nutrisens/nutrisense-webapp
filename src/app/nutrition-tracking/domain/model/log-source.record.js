/** @typedef {'manual' | 'smart-scan' | 'recipe'} LogSourceValue */

export const MANUAL = 'manual'
export const SMART_SCAN = 'smart-scan'
export const RECIPE = 'recipe'

const VALID = new Set([MANUAL, SMART_SCAN, RECIPE])

/** @param {LogSourceValue} value */
export function LogSource(value) {
  if (!VALID.has(value)) throw new Error(`Invalid log source: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isManual() { return value === MANUAL },
    /** @returns {boolean} */
    isSmartScan() { return value === SMART_SCAN },
    /** @returns {boolean} */
    isRecipe() { return value === RECIPE },
  })
}
