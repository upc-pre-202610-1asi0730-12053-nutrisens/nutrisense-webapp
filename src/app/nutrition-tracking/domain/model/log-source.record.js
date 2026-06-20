/** @typedef {'manual' | 'scan-dish' | 'scan-menu'} LogSourceValue */

export const MANUAL    = 'manual'
export const SCAN_DISH = 'scan-dish'
export const SCAN_MENU = 'scan-menu'

const VALID = new Set([MANUAL, SCAN_DISH, SCAN_MENU])

/** @param {LogSourceValue} value */
export function LogSource(value) {
  if (!VALID.has(value)) throw new Error(`Invalid log source: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isManual()   { return value === MANUAL },
    /** @returns {boolean} */
    isScanDish() { return value === SCAN_DISH },
    /** @returns {boolean} */
    isScanMenu() { return value === SCAN_MENU },
  })
}
