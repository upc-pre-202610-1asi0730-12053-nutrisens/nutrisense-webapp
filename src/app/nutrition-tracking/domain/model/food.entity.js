import { Macros } from '../../../shared/domain/model/macros.record.js'

/**
 * @typedef {Object} FoodProps
 * @property {string} id
 * @property {string} key
 * @property {string} name - display name already resolved to the active locale
 * @property {'usda' | 'open-food-facts'} source
 * @property {string|null} externalId
 * @property {number} servingSizeG
 * @property {'g' | 'ml' | 'unit'} servingUnit
 * @property {number} caloriesPer100g
 * @property {number} proteinPer100g
 * @property {number} carbsPer100g
 * @property {number} fatPer100g
 * @property {number} fiberPer100g
 * @property {number} sugarPer100g
 * @property {string[]} restrictions
 */

/** @param {FoodProps} props */
export function Food(props) {
  return Object.freeze({
    id: props.id,
    key: props.key,
    name: props.name,
    source: props.source,
    externalId: props.externalId,
    servingSizeG: props.servingSizeG,
    servingUnit: props.servingUnit,
    restrictions: props.restrictions,

    /**
     * @param {number} grams
     * @returns {ReturnType<typeof Macros>}
     */
    macrosForQuantity(grams) {
      const f = grams / 100
      return Macros({
        calories: props.caloriesPer100g * f,
        proteinG: props.proteinPer100g * f,
        carbsG: props.carbsPer100g * f,
        fatG: props.fatPer100g * f,
        fiberG: props.fiberPer100g * f,
        sugarG: props.sugarPer100g * f,
      })
    },
    /** @returns {ReturnType<typeof Macros>} macros for the default serving size */
    macrosPerServing() { return this.macrosForQuantity(props.servingSizeG) },
    /**
     * @param {string} tag - e.g. 'lactose', 'seafood', 'nuts'
     * @returns {boolean}
     */
    hasRestriction(tag) { return props.restrictions.includes(tag) },

    /**
     * Score from 1–10 based on protein-to-calorie ratio per serving.
     * Higher score means more protein-dense relative to its caloric cost.
     * @returns {number}
     */
    healthScore() {
      const m = this.macrosPerServing()
      if (m.calories === 0) return 5
      const proteinRatio = (m.proteinG * 4) / m.calories
      return Math.min(10, Math.max(1, Math.round(proteinRatio * 20 + 3)))
    },
  })
}
