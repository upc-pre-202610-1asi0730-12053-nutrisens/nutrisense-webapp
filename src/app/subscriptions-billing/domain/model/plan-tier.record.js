/** @typedef {'basic' | 'pro' | 'premium'} PlanTierValue */

export const BASIC = 'basic'
export const PRO = 'pro'
export const PREMIUM = 'premium'

const RANK = { [BASIC]: 0, [PRO]: 1, [PREMIUM]: 2 }
const HISTORY_DAYS = { [BASIC]: 30, [PRO]: 90, [PREMIUM]: Infinity }

/**
 * Whether the given value is one of the known plan tiers ({basic, pro, premium}).
 * Used to sanitise a `plan` query param before it reaches checkout.
 * @param {unknown} value
 * @returns {value is PlanTierValue}
 */
export function isValidPlanTier(value) {
  return typeof value === 'string' && value in RANK
}

/** @param {PlanTierValue} value */
export function PlanTier(value) {
  if (!(value in RANK)) throw new Error(`Invalid plan tier: ${value}`)
  return Object.freeze({
    value,
    /** @param {PlanTierValue} minimum */
    isAtLeast(minimum) { return RANK[value] >= RANK[minimum] },
    /** @returns {number} max days of log history; Infinity for unlimited */
    historyLimitDays() { return HISTORY_DAYS[value] },
    /** @returns {boolean} */
    isFree() { return value === BASIC },
  })
}
