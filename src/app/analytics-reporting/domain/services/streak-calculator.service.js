import { StreakRecord } from '../model/streak-record.entity.js'
import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

const REQUIRED_MEALS = ['breakfast', 'lunch', 'dinner']

/**
 * A day counts toward the streak when:
 * - breakfast, lunch, AND dinner are all logged
 * - total kcal is in [80%, 105%] of `calorieGoal`
 * - total proteinG is ≥ 50% of effective protein goal (falls back to 50g when `proteinGoal` ≤ 0)
 * @param {{ date: string, mealType: string, calories: number, proteinG: number }[]} logEntries
 * @param {number} calorieGoal
 * @param {number} proteinGoal - use 50g fallback when ≤ 0
 * @returns {ReturnType<typeof StreakRecord>}
 */
export function calculateStreak(logEntries, calorieGoal, proteinGoal) {
  const effectiveProteinGoal = proteinGoal > 0 ? proteinGoal : 50

  /** @type {Map<string, { meals: Set<string>, calories: number, proteinG: number }>} */
  const byDate = new Map()
  for (const { date, mealType, calories, proteinG } of logEntries) {
    if (!byDate.has(date)) byDate.set(date, { meals: new Set(), calories: 0, proteinG: 0 })
    const entry = byDate.get(date)
    entry.meals.add(mealType)
    entry.calories += calories ?? 0
    entry.proteinG += proteinG ?? 0
  }

  const completeDates = [...byDate.entries()]
    .filter(([, { meals, calories, proteinG: prot }]) => {
      if (!REQUIRED_MEALS.every(m => meals.has(m))) return false
      const calPct = calorieGoal > 0 ? (calories / calorieGoal) * 100 : 0
      if (calPct < 80 || calPct > 105) return false
      return (prot / effectiveProteinGoal) * 100 >= 50
    })
    .map(([date]) => date)
    .sort()

  if (completeDates.length === 0) {
    return StreakRecord({ currentStreak: 0, longestStreak: 0, lastLogDate: null, weeklyCompletionRate: 0, weeklyCompletionDays: Array(7).fill(false) })
  }

  let longestStreak = 1
  let tempStreak = 1
  for (let i = 1; i < completeDates.length; i++) {
    const diffDays = (new Date(completeDates[i]) - new Date(completeDates[i - 1])) / 86_400_000
    if (diffDays === 1) {
      tempStreak++
      if (tempStreak > longestStreak) longestStreak = tempStreak
    } else {
      tempStreak = 1
    }
  }

  const now = new Date()
  const today = toLocalDateString(now)
  const dateSet = new Set(completeDates)
  let currentStreak = 0
  let checkDate = today

  while (dateSet.has(checkDate)) {
    currentStreak++
    const [y, m, d] = checkDate.split('-').map(Number)
    checkDate = toLocalDateString(new Date(y, m - 1, d - 1))
  }

  const weekAgo = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  const daysThisWeek = completeDates.filter(d => d >= weekAgo && d <= today).length

  const [ty, tm, td] = today.split('-').map(Number)
  const todayLocal = new Date(ty, tm - 1, td)
  const todayDow = (todayLocal.getDay() + 6) % 7
  const weeklyCompletionDays = Array.from({ length: 7 }, (_, i) =>
    dateSet.has(toLocalDateString(new Date(ty, tm - 1, td - todayDow + i)))
  )

  return StreakRecord({
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastLogDate: completeDates[completeDates.length - 1],
    weeklyCompletionRate: daysThisWeek / 7,
    weeklyCompletionDays,
  })
}
