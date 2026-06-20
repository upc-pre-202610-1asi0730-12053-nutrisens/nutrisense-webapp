// Keys match backend PlanKey values: basic / pro / premium
const PLAN_RANK = { basic: 0, pro: 1, premium: 2 }

/**
 * @typedef {Object} SubscriptionPlanProps
 * @property {number} id
 * @property {string} key
 * @property {number} priceMonthly
 * @property {number|null} [priceAnnual]
 * @property {string} [currency]
 * @property {string[]} features
 */

/** @param {SubscriptionPlanProps} props */
export function SubscriptionPlan(props) {
  return Object.freeze({
    id: props.id,
    key: props.key,
    priceMonthly: props.priceMonthly,
    priceAnnual: props.priceAnnual ?? null,
    currency: props.currency ?? 'USD',
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
     * @returns {boolean}
     */
    isUpgradeFrom(lowerPlan) {
      return (PLAN_RANK[props.key] ?? -1) > (PLAN_RANK[lowerPlan.key] ?? -1)
    },
    /**
     * @param {SubscriptionPlanProps} fromPlan
     * @returns {'upgrade' | 'downgrade'}
     */
    planChangeType(fromPlan) {
      return (PLAN_RANK[props.key] ?? -1) > (PLAN_RANK[fromPlan.key] ?? -1)
        ? 'upgrade'
        : 'downgrade'
    },
    /**
     * @param {SubscriptionPlanProps} lowerPlan
     * @returns {string[]}
     */
    featuresGainedOver(lowerPlan) {
      return props.features.filter(f => !lowerPlan.features.includes(f))
    },
  })
}
