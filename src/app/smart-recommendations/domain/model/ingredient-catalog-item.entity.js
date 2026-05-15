import { IngredientCategory } from './ingredient-category.record.js'

/**
 * @typedef {Object} IngredientCatalogItemProps
 * @property {string} id
 * @property {string} key
 * @property {string|null} foodId
 * @property {import('./ingredient-category.record.js').IngredientCategoryValue} category
 * @property {'g' | 'ml' | 'unit'} defaultUnit
 * @property {number} [gramsPerUnit]
 */

/** @param {IngredientCatalogItemProps} props */
export function IngredientCatalogItem(props) {
  const category = IngredientCategory(props.category)

  return Object.freeze({
    id: props.id,
    key: props.key,
    foodId: props.foodId,
    category,
    defaultUnit: props.defaultUnit,

    /**
     * Converts a given quantity to grams for nutritional calculations.
     * @param {number} quantity
     * @param {'g' | 'ml' | 'unit'} unit
     * @returns {number}
     */
    normalizedGrams(quantity, unit) {
      if (unit === 'g' || unit === 'ml') return quantity
      if (unit === 'unit' && props.gramsPerUnit) return quantity * props.gramsPerUnit
      return quantity
    },
    /** @returns {boolean} */
    isMeasuredByUnit() { return props.defaultUnit === 'unit' },
    /** @returns {boolean} linked to a food record for detailed macros */
    hasFoodData() { return props.foodId !== null },
  })
}
