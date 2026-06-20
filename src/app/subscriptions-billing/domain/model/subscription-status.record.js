/**
 * @typedef {'active' | 'cancelled' | 'pending-payment' | 'expired'} SubscriptionStatusValue
 */

export const ACTIVE = 'active'
export const CANCELLED = 'cancelled'
export const PENDING_PAYMENT = 'pending-payment'
export const EXPIRED = 'expired'

const VALID = new Set([ACTIVE, CANCELLED, PENDING_PAYMENT, EXPIRED])

/** @param {SubscriptionStatusValue} value */
export function SubscriptionStatus(value) {
  // Normalize single-L spelling that may exist in older client data
  const normalized = value === 'canceled' ? 'cancelled' : value
  if (!VALID.has(normalized)) throw new Error(`Invalid subscription status: ${value}`)
  return Object.freeze({
    value: normalized,
    /** @returns {boolean} */
    isActive() { return normalized === ACTIVE },
    /** @returns {boolean} */
    isCancelled() { return normalized === CANCELLED },
    /** @returns {boolean} payment overdue — user needs to update billing */
    requiresAttention() { return normalized === PENDING_PAYMENT },
    /** @returns {boolean} */
    isPendingPayment() { return normalized === PENDING_PAYMENT },
    /** @returns {boolean} */
    isExpired() { return normalized === EXPIRED },
  })
}
