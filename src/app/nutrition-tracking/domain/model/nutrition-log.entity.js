import { Macros } from '../../../shared/domain/model/macros.record.js'
import { MealType } from './meal-type.record.js'
import { LogSource } from './log-source.record.js'
import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/**
 * @typedef {Object} NutritionLogProps
 * @property {string} id
 * @property {string} userId
 * @property {string} foodId
 * @property {string} nameEn - food name in English
 * @property {string} nameEs - food name in Spanish
 * @property {import('./meal-type.record.js').MealTypeValue} mealType
 * @property {string} date - YYYY-MM-DD
 * @property {number} quantityG
 * @property {number} calories
 * @property {number} proteinG
 * @property {number} carbsG
 * @property {number} fatG
 * @property {number} fiberG
 * @property {number} sugarG
 * @property {import('./log-source.record.js').LogSourceValue} source
 * @property {string} loggedAt
 */

/** @param {NutritionLogProps} props */
export function NutritionLog(props) {
  const mealType = MealType(props.mealType)
  const source = LogSource(props.source)

  return Object.freeze({
    id: props.id,
    userId: props.userId,
    foodId: props.foodId,
    nameEn: props.nameEn,
    nameEs: props.nameEs,
    mealType,
    date: props.date,
    quantityG: props.quantityG,
    source,
    loggedAt: props.loggedAt,

    /**
     * Returns the food name for the given locale, falling back to the other
     * language so there is always a readable label.
     * @param {string} [locale]
     * @returns {string}
     */
    displayName(locale = 'en') {
      return locale?.startsWith('es')
        ? (props.nameEs || props.nameEn || '')
        : (props.nameEn || props.nameEs || '')
    },

    /** @returns {ReturnType<typeof Macros>} */
    macros() {
      return Macros({
        calories: props.calories,
        proteinG: props.proteinG,
        carbsG: props.carbsG,
        fatG: props.fatG,
        fiberG: props.fiberG,
        sugarG: props.sugarG,
      })
    },
    /** @returns {boolean} */
    isToday() { return props.date === toLocalDateString() },
    /**
     * @param {string} date - YYYY-MM-DD
     * @returns {boolean}
     */
    isOnDate(date) { return props.date === date },
    /** @returns {boolean} */
    isFromScan() { return source.isScanDish() || source.isScanMenu() },
  })
}
