import { Badge } from './badge.record.js'

/**
 * @typedef {Object} RecommendationCardProps
 * @property {number} id
 * @property {number|null} foodId
 * @property {string} foodNameEn
 * @property {string} foodNameEs
 * @property {number} estimatedCalories
 * @property {number} estimatedProteinG
 * @property {number} estimatedCarbsG
 * @property {number} estimatedFatG
 * @property {import('./badge.record.js').BadgeValue} badge
 * @property {string} contextLabelEn
 * @property {string} contextLabelEs
 * @property {string[]} restrictionsConflict
 */

/** @param {RecommendationCardProps} props */
export function RecommendationCard(props) {
  const badge = Badge(props.badge)

  return Object.freeze({
    id: props.id,
    foodId: props.foodId,
    foodNameEn: props.foodNameEn,
    foodNameEs: props.foodNameEs,
    estimatedCalories: props.estimatedCalories,
    estimatedProteinG: props.estimatedProteinG,
    estimatedCarbsG: props.estimatedCarbsG,
    estimatedFatG: props.estimatedFatG,
    badge: props.badge,
    contextLabelEn: props.contextLabelEn,
    contextLabelEs: props.contextLabelEs,
    restrictionsConflict: props.restrictionsConflict,

    /**
     * @param {string[]} userRestrictionTags
     * @returns {boolean}
     */
    conflictsWith(userRestrictionTags) {
      return props.restrictionsConflict.some(tag => userRestrictionTags.includes(tag))
    },
    /** @returns {boolean} */
    isLocalDish() { return badge.isLocalDish() },
  })
}
