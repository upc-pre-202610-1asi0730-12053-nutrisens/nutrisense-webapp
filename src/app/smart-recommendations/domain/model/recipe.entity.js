import { Macros } from '../../../shared/domain/model/macros.record.js'

/**
 * @typedef {Object} RecipeIngredient
 * @property {number} ingredientId
 * @property {number} quantity
 * @property {'g' | 'ml' | 'unit'} unit
 */

/**
 * @typedef {Object} RecipeProps
 * @property {number} id
 * @property {string} key
 * @property {string} nameEn
 * @property {string} nameEs
 * @property {import('../../../../shared/domain/model/goal-type.record.js').GoalTypeValue | 'both'} goalType
 * @property {number} prepTimeMinutes
 * @property {number} servings
 * @property {number} totalCalories
 * @property {number} totalProteinG
 * @property {number} totalCarbsG
 * @property {number} totalFatG
 * @property {number} totalFiberG
 * @property {string[]} restrictionsConflict
 * @property {RecipeIngredient[]} ingredients
 */

/** @param {RecipeProps} props */
export function Recipe(props) {
  const totalMacros = Macros({
    calories: props.totalCalories,
    proteinG: props.totalProteinG,
    carbsG: props.totalCarbsG,
    fatG: props.totalFatG,
    fiberG: props.totalFiberG,
  })

  return Object.freeze({
    id: props.id,
    key: props.key,
    nameEn: props.nameEn,
    nameEs: props.nameEs,
    goalType: props.goalType,
    prepTimeMinutes: props.prepTimeMinutes,
    servings: props.servings,
    totalMacros,
    restrictionsConflict: props.restrictionsConflict,
    ingredients: props.ingredients,

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
     * @param {string[]} pantryIngredientIds
     * @param {number} [threshold=0.7]
     * @returns {boolean}
     */
    matchesPantry(pantryIngredientIds, threshold = 0.7) {
      if (props.ingredients.length === 0) return false
      const matched = props.ingredients.filter(i => pantryIngredientIds.includes(i.ingredientId))
      return matched.length / props.ingredients.length >= threshold
    },
    /**
     * @param {string[]} pantryIngredientIds
     * @returns {string[]} ingredient IDs not found in pantry
     */
    missingIngredients(pantryIngredientIds) {
      return props.ingredients
        .filter(i => !pantryIngredientIds.includes(i.ingredientId))
        .map(i => i.ingredientId)
    },
  })
}
