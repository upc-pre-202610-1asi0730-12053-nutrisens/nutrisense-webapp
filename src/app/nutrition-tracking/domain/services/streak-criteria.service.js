// PATH: src/app/nutrition-tracking/domain/services/streak-criteria.service.js

/**
 * @typedef {Object} StreakDayInput
 * @property {number} dailyCaloriesConsumed
 * @property {number} calorieGoal
 * @property {Record<string, { length: number }[]>} logsByMealType
 * @property {{ proteinG: number }} dailyMacros
 * @property {number} proteinGoal
 */

/**
 * Evaluates whether a logged day meets the streak completion criteria:
 * - kcal consumed is within [80%, 105%] of the daily calorie goal
 * - breakfast, lunch, and dinner all have at least one log entry
 * - protein consumed is ≥ 50% of the protein goal (fallback: 50 g)
 *
 * @param {StreakDayInput} input
 * @returns {boolean}
 */
export function isStreakDayMet({ dailyCaloriesConsumed, calorieGoal, logsByMealType, dailyMacros, proteinGoal }) {
  const calPct = dailyCaloriesConsumed / calorieGoal * 100
  if (calPct < 80 || calPct > 105) return false

  const hasMeals = ['breakfast', 'lunch', 'dinner'].every(
    m => (logsByMealType[m]?.length ?? 0) > 0
  )
  if (!hasMeals) return false

  const effectiveProteinGoal = proteinGoal > 0 ? proteinGoal : 50
  return (dailyMacros.proteinG / effectiveProteinGoal * 100) >= 50
}
