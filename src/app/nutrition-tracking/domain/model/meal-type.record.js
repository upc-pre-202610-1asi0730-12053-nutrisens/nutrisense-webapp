/** @typedef {'breakfast' | 'lunch' | 'snack' | 'dinner'} MealTypeValue */

export const BREAKFAST = 'breakfast'
export const LUNCH = 'lunch'
export const SNACK = 'snack'
export const DINNER = 'dinner'

const VALID = new Set([BREAKFAST, LUNCH, SNACK, DINNER])

/** @param {MealTypeValue} value */
export function MealType(value) {
  if (!VALID.has(value)) throw new Error(`Invalid meal type: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isBreakfast() { return value === BREAKFAST },
    /** @returns {boolean} lunch or dinner */
    isMainMeal() { return value === LUNCH || value === DINNER },
  })
}
