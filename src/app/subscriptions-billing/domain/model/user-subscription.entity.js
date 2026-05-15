import { SubscriptionStatus } from './subscription-status.record.js'
import { BillingPeriod } from './billing-period.record.js'

/**
 * @typedef {Object} UserSubscriptionProps
 * @property {string} id
 * @property {string} userId
 * @property {string} planId
 * @property {import('./subscription-status.record.js').SubscriptionStatusValue} status
 * @property {import('./billing-period.record.js').BillingPeriodValue} billingPeriod
 * @property {string|null} periodStart
 * @property {string|null} periodEnd
 * @property {boolean} cancelAtPeriodEnd
 * @property {string|null} stripeSubscriptionId
 */

/** @param {UserSubscriptionProps} props */
export function UserSubscription(props) {
  const status = SubscriptionStatus(props.status)
  const billingPeriod = BillingPeriod(props.billingPeriod)

  return Object.freeze({
    id: props.id,
    userId: props.userId,
    planId: props.planId,
    status,
    billingPeriod,
    periodStart: props.periodStart,
    periodEnd: props.periodEnd,
    cancelAtPeriodEnd: props.cancelAtPeriodEnd,
    stripeSubscriptionId: props.stripeSubscriptionId,

    /** @returns {boolean} */
    isActive() { return status.isActive() },
    /** @returns {boolean} active but scheduled to cancel at period end */
    willCancel() { return props.cancelAtPeriodEnd && status.isActive() },
    /** @returns {Date|null} */
    renewalDate() { return props.periodEnd ? new Date(props.periodEnd) : null },
    /**
     * @param {Date} [now=new Date()]
     * @returns {number|null} null if free plan
     */
    daysUntilRenewal(now = new Date()) {
      if (!props.periodEnd) return null
      return Math.ceil((new Date(props.periodEnd).getTime() - now.getTime()) / 86_400_000)
    },
    /** @returns {boolean} */
    isFree() { return billingPeriod.isFree() },
  })
}
