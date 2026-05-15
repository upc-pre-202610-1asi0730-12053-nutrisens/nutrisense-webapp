/** @typedef {'monthly' | 'annual' | null} BillingPeriodValue */

export const MONTHLY = 'monthly'
export const ANNUAL = 'annual'

/** @param {BillingPeriodValue} value */
export function BillingPeriod(value) {
  if (value !== null && value !== MONTHLY && value !== ANNUAL) {
    throw new Error(`Invalid billing period: ${value}`)
  }
  return Object.freeze({
    value,
    /** @returns {boolean} free plan with no billing cycle */
    isFree() { return value === null },
    /** @returns {boolean} */
    isMonthly() { return value === MONTHLY },
    /** @returns {boolean} */
    isAnnual() { return value === ANNUAL },
    /** @returns {number|null} estimated discount % vs monthly; null if not annual */
    annualSavingsPercent() { return value === ANNUAL ? 20 : null },
  })
}
