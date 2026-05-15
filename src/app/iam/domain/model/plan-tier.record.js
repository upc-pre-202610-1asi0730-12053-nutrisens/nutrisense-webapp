/** @typedef {'basic' | 'pro' | 'premium'} PlanTierValue */

export const BASIC = 'basic'
export const PRO = 'pro'
export const PREMIUM = 'premium'

const RANK = { [BASIC]: 0, [PRO]: 1, [PREMIUM]: 2 }
const HISTORY_DAYS = { [BASIC]: 30, [PRO]: 90, [PREMIUM]: Infinity }

/** @param {PlanTierValue} value */
export function PlanTier(value) {
  if (!(value in RANK)) throw new Error(`Invalid plan tier: ${value}`)
  return Object.freeze({
    value,
    /**
     * @param {PlanTierValue} minimum
     * @returns {boolean}
     */
    isAtLeast(minimum) { return RANK[value] >= RANK[minimum] },
    /** @returns {number} max days of log history; Infinity for unlimited */
    historyLimitDays() { return HISTORY_DAYS[value] },
    /** @returns {boolean} */
    isFree() { return value === BASIC },
  })
}
