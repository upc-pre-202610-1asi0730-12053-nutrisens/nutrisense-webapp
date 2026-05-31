import { Badge } from './badge.record.js'
import { WeatherType } from './weather-type.record.js'

/**
 * @typedef {Object} RecommendationCardProps
 * @property {string} id
 * @property {string} cityId
 * @property {import('./weather-type.record.js').WeatherTypeValue} weatherType
 * @property {import('../../../../shared/domain/model/goal-type.record.js').GoalTypeValue | 'both'} goalType
 * @property {string|null} foodId
 * @property {string} [customFoodNameKey]
 * @property {number} estimatedCalories
 * @property {number} estimatedProteinG
 * @property {number} estimatedCarbsG
 * @property {number} estimatedFatG
 * @property {import('./badge.record.js').BadgeValue} badge
 * @property {string} contextLabelKey
 * @property {string[]} restrictionsConflict
 */

/** @param {RecommendationCardProps} props */
export function RecommendationCard(props) {
  const badge = Badge(props.badge)
  const weatherType = WeatherType(props.weatherType)

  return Object.freeze({
    id: props.id,
    cityId: props.cityId,
    weatherType,
    goalType: props.goalType,
    foodId: props.foodId,
    customFoodNameKey: props.customFoodNameKey ?? null,
    estimatedCalories: props.estimatedCalories,
    estimatedProteinG: props.estimatedProteinG,
    estimatedCarbsG: props.estimatedCarbsG,
    estimatedFatG: props.estimatedFatG,
    badge: props.badge,
    contextLabelKey: props.contextLabelKey,
    restrictionsConflict: props.restrictionsConflict,

    /**
     * @param {string[]} userRestrictionTags
     * @returns {boolean}
     */
    conflictsWith(userRestrictionTags) {
      return props.restrictionsConflict.some(tag => userRestrictionTags.includes(tag))
    },
    /**
     * @param {import('../../../../shared/domain/model/goal-type.record.js').GoalTypeValue} goal
     * @returns {boolean}
     */
    matchesGoal(goal) {
      return props.goalType === 'both' || props.goalType === goal
    },
    /**
     * @param {import('./weather-type.record.js').WeatherTypeValue} currentWeatherType
     * @returns {boolean}
     */
    matchesWeather(currentWeatherType) { return props.weatherType === currentWeatherType },
    /**
     * @param {string} cityId
     * @returns {boolean}
     */
    matchesCity(cityId) { return props.cityId === cityId },
    /** @returns {boolean} */
    isLocalDish() { return badge.isLocalDish() },
  })
}
