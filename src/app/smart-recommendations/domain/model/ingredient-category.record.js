/** @typedef {'protein' | 'grain' | 'vegetable' | 'fruit' | 'fat' | 'dairy' | 'legume' | 'supplement'} IngredientCategoryValue */

export const PROTEIN = 'protein'
export const GRAIN = 'grain'
export const VEGETABLE = 'vegetable'
export const FRUIT = 'fruit'
export const FAT = 'fat'
export const DAIRY = 'dairy'
export const LEGUME = 'legume'
export const SUPPLEMENT = 'supplement'

const VALID = new Set([PROTEIN, GRAIN, VEGETABLE, FRUIT, FAT, DAIRY, LEGUME, SUPPLEMENT])

/** @param {IngredientCategoryValue} value */
export function IngredientCategory(value) {
  if (!VALID.has(value)) throw new Error(`Invalid ingredient category: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} protein, dairy, or legume */
    isProteinSource() {
      return value === PROTEIN || value === DAIRY || value === LEGUME
    },
    /** @returns {boolean} grain, fruit, or vegetable */
    isCarbohydrateSource() {
      return value === GRAIN || value === FRUIT || value === VEGETABLE
    },
  })
}
