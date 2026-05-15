/** @typedef {'active' | 'cancelled' | 'past-due'} SubscriptionStatusValue */

export const ACTIVE = 'active'
export const CANCELLED = 'cancelled'
export const PAST_DUE = 'past-due'

const VALID = new Set([ACTIVE, CANCELLED, PAST_DUE])

/** @param {SubscriptionStatusValue} value */
export function SubscriptionStatus(value) {
  if (!VALID.has(value)) throw new Error(`Invalid subscription status: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isActive() { return value === ACTIVE },
    /** @returns {boolean} */
    isCancelled() { return value === CANCELLED },
    /** @returns {boolean} payment overdue — user needs to update billing */
    requiresAttention() { return value === PAST_DUE },
  })
}
