// PATH: src/app/analytics-reporting/application/analytics-reporting.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AnalyticsReportingApi } from '../infrastructure/analytics-reporting.api.js'
import { StreakRecordAssembler } from '../infrastructure/streak-record.assembler.js'
import { calculateStreak } from '../domain/services/streak-calculator.service.js'
import { weeklyAdherenceRate } from '../domain/services/adherence-calculator.service.js'
import { on } from '../../shared/infrastructure/event-bus.js'
import { NUTRITION_LOG_ADDED, ACTIVITY_LOGGED } from '../../shared/domain/events/event-types.js'

const analyticsReportingApi = new AnalyticsReportingApi()

/**
 * Store for streak tracking and nutritional adherence analytics.
 */
export const useAnalyticsReportingStore = defineStore('analytics-reporting', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/streak-record.entity.js').StreakRecord>|null>} */
  const streak = ref(null)
  /** @type {import('vue').Ref<string|null>} */
  const streakId = ref(null)
  /** @type {import('vue').Ref<'7d'|'30d'|'90d'|'custom'>} */
  const selectedRange = ref('7d')
  /** @type {import('vue').Ref<Date|null>} */
  const customStartDate = ref(null)
  /** @type {import('vue').Ref<Date|null>} */
  const customEndDate = ref(null)
  const streakLoaded = ref(false)
  const streakComputedFromLogs = ref(false)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])
  /** @type {import('vue').Ref<number>} */
  const lastRefreshed = ref(Date.now())

  /**
   * Start and end dates for the selected range.
   * @type {import('vue').ComputedRef<{start: Date, end: Date}>}
   */
  const dateRange = computed(() => {
    void lastRefreshed.value
    const end = new Date()
    if (selectedRange.value === 'custom' && customStartDate.value && customEndDate.value) {
      return { start: customStartDate.value, end: customEndDate.value }
    }
    const days = { '7d': 7, '30d': 30, '90d': 90 }[selectedRange.value] ?? 7
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    return { start, end }
  })

  /**
   * Whether the current streak is at risk (no log today, streak > 0).
   * @type {import('vue').ComputedRef<boolean>}
   */
  const streakAtRisk = computed(() => streak.value?.isAtRisk() ?? false)

  /**
   * Whether the current streak is broken.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const streakBroken = computed(() => streak.value?.isBroken() ?? false)

  /**
   * i18n key for the motivational message of the current streak.
   * @type {import('vue').ComputedRef<string>}
   */
  const streakMessage = computed(() => streak.value?.motivationalMessageKey() ?? '')

  /**
   * Weekly completion percentage (0–100).
   * @type {import('vue').ComputedRef<number>}
   */
  const weeklyCompletionPercent = computed(() =>
    streak.value?.weeklyCompletionPercent() ?? 0
  )

  /**
   * Calculates KPI data from plain nutrition and weight entries.
   * @param {{ calories: number, proteinG: number }[]} nutritionEntries
   * @param {{ loggedAt: string, weightKg: number }[]} weightEntries
   * @returns {{ avgKcal: number, avgProtein: number, weightChange: number, currentStreak: number, weeklyCompletion: number }}
   */
  function calculateKpis(nutritionEntries, weightEntries) {
    const avgKcal = nutritionEntries.length
      ? nutritionEntries.reduce((s, e) => s + e.calories, 0) / nutritionEntries.length
      : 0
    const avgProtein = nutritionEntries.length
      ? nutritionEntries.reduce((s, e) => s + e.proteinG, 0) / nutritionEntries.length
      : 0
    const sorted = [...weightEntries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    const weightChange = sorted.length >= 2
      ? sorted.at(-1).weightKg - sorted[0].weightKg
      : 0
    return {
      avgKcal: Math.round(avgKcal),
      avgProtein: Math.round(avgProtein),
      weightChange: Math.round(weightChange * 10) / 10,
      currentStreak: streak.value?.currentStreak ?? 0,
      weeklyCompletion: weeklyCompletionPercent.value,
    }
  }

  /**
   * Calculates weekly adherence percentage from an array of log date strings (YYYY-MM-DD).
   * @param {string[]} logDates
   * @returns {number} 0–100
   */
  function calculateAdherence(logDates) {
    return Math.round(weeklyAdherenceRate(logDates) * 100)
  }

  /**
   * Persists the current streak value to the API.
   * No-op if streakId is not yet known.
   * @param {ReturnType<import('../domain/model/streak-record.entity.js').StreakRecord>} entity
   */
  function persistStreak(entity) {
    if (!streakId.value) return
    const resource = {
      currentStreak: entity.currentStreak,
      longestStreak: entity.longestStreak,
      lastLogDate: entity.lastLogDate,
      weeklyCompletionRate: entity.weeklyCompletionRate,
    }
    analyticsReportingApi.updateStreak(streakId.value, resource)
      .catch(() => {})
  }

  /**
   * Loads the streak record for the given user. Creates one if none exists.
   * If logs were already computed before the record was fetched, persists the
   * computed value instead of overwriting it with the stale API value.
   * @param {string} userId
   */
  function fetchStreak(userId) {
    analyticsReportingApi.getStreak(userId)
      .then(response => {
        const resources = Array.isArray(response.data) ? response.data : []
        const resource = resources[0] ?? null
        if (resource) {
          streakId.value = resource.id
          if (streakComputedFromLogs.value) {
            persistStreak(streak.value)
          } else {
            streak.value = StreakRecordAssembler.toEntityFromResource(resource)
          }
          streakLoaded.value = true
        } else {
          return analyticsReportingApi.createStreak({
            userId,
            currentStreak: 0,
            longestStreak: 0,
            lastLogDate: null,
            weeklyCompletionRate: 0,
          }).then(createResponse => {
            streakId.value = createResponse.data?.id ?? null
            if (streakComputedFromLogs.value) {
              persistStreak(streak.value)
            } else {
              streak.value = StreakRecordAssembler.toEntityFromResponse(createResponse)
            }
            streakLoaded.value = true
          })
        }
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Recalculates streak from log entries and persists the result.
   * A day counts when breakfast+lunch+dinner are logged, kcal is in [80%, 105%] of goal,
   * and proteinG meets ≥50% of the protein goal (fallback 50g).
   * @param {{ date: string, mealType: string, calories: number, proteinG: number }[]} logEntries
   * @param {number} calorieGoal
   * @param {number} proteinGoal
   */
  function updateStreakAfterLog(logEntries, calorieGoal, proteinGoal) {
    const updated = calculateStreak(logEntries, calorieGoal, proteinGoal)
    streak.value = updated
    streakComputedFromLogs.value = true
    persistStreak(updated)
  }

  /**
   * Sets the analytics time range.
   * @param {'7d'|'30d'|'90d'|'custom'} range
   */
  function setRange(range) {
    selectedRange.value = range
  }

  /**
   * Sets a custom date range and switches to custom mode.
   * @param {Date} startDate
   * @param {Date} endDate
   */
  function setCustomRange(startDate, endDate) {
    customStartDate.value = startDate
    customEndDate.value = endDate
    selectedRange.value = 'custom'
  }

  /** Forces `dateRange` to recompute with the current timestamp. */
  function refreshDateRange() {
    lastRefreshed.value = Date.now()
  }

  on(NUTRITION_LOG_ADDED, ({ logEntries, calorieGoal, proteinGoal }) => {
    updateStreakAfterLog(logEntries, calorieGoal, proteinGoal)
  })

  on(ACTIVITY_LOGGED, () => {
    refreshDateRange()
  })

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    streak,
    streakId,
    selectedRange,
    customStartDate,
    customEndDate,
    streakLoaded,
    errors,
    dateRange,
    streakAtRisk,
    streakBroken,
    streakMessage,
    weeklyCompletionPercent,
    calculateKpis,
    calculateAdherence,
    fetchStreak,
    updateStreakAfterLog,
    setRange,
    setCustomRange,
    refreshDateRange,
    clearErrors,
  }
})
