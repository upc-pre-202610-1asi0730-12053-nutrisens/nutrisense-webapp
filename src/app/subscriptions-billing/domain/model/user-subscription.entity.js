import { SubscriptionStatus } from './subscription-status.record.js'
import { BillingPeriod } from './billing-period.record.js'

/** Number of days used as the standard billing month for proration. */
const BILLING_MONTH_DAYS = 30

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
 * @property {string|null} [lastPlanChangeAt] - ISO date string of the last plan change, used to enforce the daily change limit.
 * @property {string|null} [paymentMethodId] - ID of the payment method linked to this subscription.
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
    lastPlanChangeAt: props.lastPlanChangeAt ?? null,
    paymentMethodId: props.paymentMethodId ?? null,

    /** @returns {boolean} */
    isActive() { return status.isActive() },
    /** @returns {boolean} active but scheduled to cancel at period end */
    willCancel() { return props.cancelAtPeriodEnd && status.isActive() },
    /** @returns {Date|null} */
    renewalDate() { return props.periodEnd ? new Date(props.periodEnd) : null },
    /**
     * @param {Date} [now=new Date()]
     * @returns {number|null} null if no period end defined
     */
    daysUntilRenewal(now = new Date()) {
      if (!props.periodEnd) return null
      return Math.ceil((new Date(props.periodEnd).getTime() - now.getTime()) / 86_400_000)
    },
    /** @returns {boolean} */
    isFree() { return billingPeriod.isFree() },
    /**
     * Whether this subscription has already been changed once today,
     * enforcing the one-plan-change-per-day business rule.
     * @param {Date} [now=new Date()]
     * @returns {boolean}
     */
    canChangePlanToday(now = new Date()) {
      if (!props.lastPlanChangeAt) return true
      const lastChange = new Date(props.lastPlanChangeAt)
      return (
        lastChange.getFullYear() !== now.getFullYear() ||
        lastChange.getMonth() !== now.getMonth() ||
        lastChange.getDate() !== now.getDate()
      )
    },
    /**
     * Calculates the prorated amount to charge (positive) or credit (negative)
     * when switching from one plan to another mid-cycle.
     *
     * Formula: (newDailyRate − oldDailyRate) × daysRemaining
     * where dailyRate = plan.priceMonthly / BILLING_MONTH_DAYS
     *
     * @param {{ priceMonthly: number }} fromPlan
     * @param {{ priceMonthly: number }} toPlan
     * @param {Date} [now=new Date()]
     * @returns {number} rounded to 2 decimal places; negative means a credit
     */
    proratedChangeAmount(fromPlan, toPlan, now = new Date()) {
      const days = this.daysUntilRenewal(now) ?? 0
      const dailyDiff = (toPlan.priceMonthly - fromPlan.priceMonthly) / BILLING_MONTH_DAYS
      return Math.round(dailyDiff * days * 100) / 100
    },
  })
}
