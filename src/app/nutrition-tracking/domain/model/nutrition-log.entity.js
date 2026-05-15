import { Macros } from '../../../shared/domain/model/macros.record.js'
import { MealType } from './meal-type.record.js'
import { LogSource } from './log-source.record.js'
import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

/**
 * @typedef {Object} NutritionLogProps
 * @property {string} id
 * @property {string} userId
 * @property {string} foodId
 * @property {string} foodKey
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
    foodKey: props.foodKey,
    mealType,
    date: props.date,
    quantityG: props.quantityG,
    source,
    loggedAt: props.loggedAt,

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
    isFromSmartScan() { return source.isSmartScan() },
  })
}
