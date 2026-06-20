// PATH: src/app/analytics-reporting/application/analytics-reporting.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AnalyticsReportingApi } from '../infrastructure/analytics-reporting.api.js'
import { StreakRecordAssembler } from '../infrastructure/streak-record.assembler.js'
import { on } from '../../shared/infrastructure/event-bus.js'
import { ACTIVITY_LOGGED } from '../../shared/domain/events/event-types.js'

const analyticsReportingApi = new AnalyticsReportingApi()

/**
 * Store for streak tracking and nutritional adherence analytics.
 * Streak is server-managed: no POST/PUT to streak_records.
 * KPI aggregation and adherence use backend analytics endpoints.
 */
export const useAnalyticsReportingStore = defineStore('analytics-reporting', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/streak-record.entity.js').StreakRecord>|null>} */
  const streak = ref(null)
  /** @type {import('vue').Ref<'7d'|'30d'|'90d'|'custom'>} */
  const selectedRange = ref('7d')
  /** @type {import('vue').Ref<Date|null>} */
  const customStartDate = ref(null)
  /** @type {import('vue').Ref<Date|null>} */
  const customEndDate = ref(null)
  const streakLoaded = ref(false)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])
  /** @type {import('vue').Ref<number>} */
  const lastRefreshed = ref(Date.now())
  /**
   * Today's dashboard snapshot from GET /analytics/dashboard/by-user/{userId}.
   * @type {import('vue').Ref<{userId:number,date:string,totalCalories:number,totalProteinG:number,totalCarbsG:number,totalFatG:number,activeCaloriesBurned:number,adherenceScore:number,currentStreak:number,weeklyCompletionRate:number}|null>}
   */
  const dashboard = ref(null)
  /**
   * Range progress data from GET /analytics/progress/by-user/{userId}.
   * @type {import('vue').Ref<{userId:number,from:string,to:string,snapshots:{date:string,totalCalories:number,adherenceScore:number}[]}|null>}
   */
  const progress = ref(null)

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

  /** @type {import('vue').ComputedRef<boolean>} */
  const streakAtRisk = computed(() => streak.value?.isAtRisk() ?? false)

  /** @type {import('vue').ComputedRef<boolean>} */
  const streakBroken = computed(() => streak.value?.isBroken() ?? false)

  /** @type {import('vue').ComputedRef<string>} */
  const streakMessage = computed(() => streak.value?.motivationalMessageKey() ?? '')

  /** @type {import('vue').ComputedRef<number>} */
  const weeklyCompletionPercent = computed(() =>
    streak.value?.weeklyCompletionPercent() ?? 0
  )

  /**
   * Calculates KPI data for the current date range.
   * avgKcal: derived from progress snapshots (server-side daily totals).
   * avgProtein: derived from passed nutrition entries (no analytics endpoint covers range protein).
   * weightChange: derived from passed weight entries (no weight history endpoint).
   * @param {{ calories: number, proteinG: number }[]} nutritionEntries
   * @param {{ loggedAt: string, weightKg: number }[]} weightEntries
   * @returns {{ avgKcal: number, avgProtein: number, weightChange: number, currentStreak: number, weeklyCompletion: number }}
   */
  function calculateKpis(nutritionEntries, weightEntries) {
    const snapshots = progress.value?.snapshots ?? []
    const avgKcal = snapshots.length
      ? Math.round(snapshots.reduce((s, snap) => s + snap.totalCalories, 0) / snapshots.length)
      : nutritionEntries.length
        ? Math.round(nutritionEntries.reduce((s, e) => s + e.calories, 0) / nutritionEntries.length)
        : 0

    const avgProtein = nutritionEntries.length
      ? Math.round(nutritionEntries.reduce((s, e) => s + e.proteinG, 0) / nutritionEntries.length)
      : 0

    const sorted = [...weightEntries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    const weightChange = sorted.length >= 2
      ? Math.round((sorted.at(-1).weightKg - sorted[0].weightKg) * 10) / 10
      : 0

    return {
      avgKcal,
      avgProtein,
      weightChange,
      currentStreak: streak.value?.currentStreak ?? 0,
      weeklyCompletion: weeklyCompletionPercent.value,
    }
  }

  /**
   * Returns the average adherence percentage for the selected date range,
   * derived from progress snapshots (server-side).
   * @returns {number} 0–100
   */
  function calculateAdherence() {
    const snapshots = progress.value?.snapshots ?? []
    if (!snapshots.length) return 0
    return Math.round(
      snapshots.reduce((s, snap) => s + snap.adherenceScore, 0) / snapshots.length
    )
  }

  /**
   * Loads the streak record for the given user from the server.
   * The streak is fully managed server-side; no local calculation or write-back.
   * @param {string} userId
   */
  function fetchStreak(userId) {
    analyticsReportingApi.getStreak(userId)
      .then(response => {
        streak.value = StreakRecordAssembler.toEntityFromResource(response.data)
        streakLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Fetches the dashboard snapshot for a specific day.
   * @param {string} userId
   * @param {string} date - YYYY-MM-DD
   */
  function fetchDashboard(userId, date) {
    analyticsReportingApi.getDashboard(userId, date)
      .then(response => { dashboard.value = response.data })
      .catch(error => errors.value.push(error))
  }

  /**
   * Fetches progress chart data for the given date range.
   * Populates `progress` which drives calculateKpis and calculateAdherence.
   * @param {string} userId
   * @param {string} from - YYYY-MM-DD
   * @param {string} to - YYYY-MM-DD
   */
  function fetchProgress(userId, from, to) {
    analyticsReportingApi.getProgress(userId, from, to)
      .then(response => { progress.value = response.data })
      .catch(error => errors.value.push(error))
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

  on(ACTIVITY_LOGGED, () => {
    refreshDateRange()
  })

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    streak,
    selectedRange,
    customStartDate,
    customEndDate,
    streakLoaded,
    errors,
    dashboard,
    progress,
    dateRange,
    streakAtRisk,
    streakBroken,
    streakMessage,
    weeklyCompletionPercent,
    calculateKpis,
    calculateAdherence,
    fetchStreak,
    fetchDashboard,
    fetchProgress,
    setRange,
    setCustomRange,
    refreshDateRange,
    clearErrors,
  }
})
