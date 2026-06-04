const PLAN_RANK = { 'plan-basic': 0, 'plan-pro': 1, 'plan-premium': 2 }

/**
 * @typedef {Object} SubscriptionPlanProps
 * @property {string} id
 * @property {string} key
 * @property {number} priceMonthly
 * @property {string[]} features
 */

/** @param {SubscriptionPlanProps} props */
export function SubscriptionPlan(props) {
  return Object.freeze({
    id: props.id,
    key: props.key,
    priceMonthly: props.priceMonthly,
    features: props.features,

    /**
     * @param {string} feature
     * @returns {boolean}
     */
    hasFeature(feature) { return props.features.includes(feature) },
    /** @returns {boolean} */
    isFree() { return props.priceMonthly === 0 },
    /**
     * @param {SubscriptionPlanProps} lowerPlan
     * @returns {boolean} this plan is a higher tier than lowerPlan
     */
    isUpgradeFrom(lowerPlan) {
      return (PLAN_RANK[props.id] ?? -1) > (PLAN_RANK[lowerPlan.id] ?? -1)
    },
    /**
     * Resolves the direction of a plan change relative to another plan.
     * @param {SubscriptionPlanProps} fromPlan - The plan being left.
     * @returns {'upgrade' | 'downgrade'}
     */
    planChangeType(fromPlan) {
      return (PLAN_RANK[props.id] ?? -1) > (PLAN_RANK[fromPlan.id] ?? -1)
        ? 'upgrade'
        : 'downgrade'
    },
    /**
     * @param {SubscriptionPlanProps} lowerPlan
     * @returns {string[]} feature IDs gained when upgrading to this plan
     */
    featuresGainedOver(lowerPlan) {
      return props.features.filter(f => !lowerPlan.features.includes(f))
    },
  })
}
