/** @typedef {'usda' | 'open-food-facts'} FoodSourceValue */

export const USDA = 'usda'
export const OPEN_FOOD_FACTS = 'open-food-facts'

const VALID = new Set([USDA, OPEN_FOOD_FACTS])

/** @param {FoodSourceValue} value */
export function FoodSource(value) {
  if (!VALID.has(value)) throw new Error(`Invalid food source: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isUsda() { return value === USDA },
    /** @returns {boolean} */
    isOpenFoodFacts() { return value === OPEN_FOOD_FACTS },
  })
}
