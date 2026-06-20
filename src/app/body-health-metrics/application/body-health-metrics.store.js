// PATH: src/app/body-health-metrics/application/body-health-metrics.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BodyHealthMetricsApi } from '../infrastructure/body-health-metrics.api.js'
import { BodyMetricsAssembler } from '../infrastructure/body-metrics.assembler.js'
import { WeightLogAssembler } from '../infrastructure/weight-log.assembler.js'
import { BodyMeasurement } from '../domain/model/body-measurement.entity.js'
import { calculateBmi, calculateBmr, calculateTdee } from '../domain/services/body-metrics.service.js'
import { emit } from '../../shared/infrastructure/event-bus.js'
import { createDomainEvent } from '../../shared/domain/events/domain-event.js'
import { GOAL_UPDATED, WEIGHT_UPDATED } from '../../shared/domain/events/event-types.js'

const bodyHealthMetricsApi = new BodyHealthMetricsApi()

/**
 * Store for body metrics, weight history, and health goals.
 * All mutations go through the consolidated /body-metrics API.
 * BMI, BMR, and TDEE are exposed as functions to keep external dependencies explicit.
 */
export const useBodyHealthMetricsStore = defineStore('body-health-metrics', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/body-measurement.entity.js').BodyMeasurement>|null>} */
  const bodyMeasurement = ref(null)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/body-measurement.entity.js').BodyMeasurement>[]>} */
  const bodyMeasurements = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/weight-log.entity.js').WeightLog>[]>} */
  const weightLogs = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user-goal.entity.js').UserGoal>|null>} */
  const userGoal = ref(null)
  const measurementLoaded = ref(false)
  const weightLogsLoaded = ref(false)
  const goalLoaded = ref(false)
  const weightSaving = ref(false)
  /** @type {import('vue').Ref<number|null>} */
  const userHeightCm = ref(null)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])

  /**
   * Last 7 weight logs sorted ascending by date.
   * Feeds the weight trend chart.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/weight-log.entity.js').WeightLog>[]>}
   */
  const weightTrend = computed(() =>
    [...weightLogs.value]
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
      .slice(-7)
  )

  /**
   * Today's weight log, if it exists.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/weight-log.entity.js').WeightLog>|null>}
   */
  const todayWeightLog = computed(() =>
    weightLogs.value.find(l => l.isToday()) ?? null
  )

  /**
   * Most recent weight in kg, or null.
   * @type {import('vue').ComputedRef<number|null>}
   */
  const latestWeightKg = computed(() => weightLogs.value[0]?.weightKg ?? null)

  /**
   * @param {number} weightKg
   * @param {number} heightCm
   * @returns {ReturnType<import('../domain/model/bmi-result.record.js').BmiResult>|null}
   */
  function getBmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null
    return calculateBmi(weightKg, heightCm)
  }

  /**
   * @param {number} weightKg
   * @param {number} heightCm
   * @param {number} ageYears
   * @param {string} biologicalSex
   * @returns {number|null}
   */
  function getBmr(weightKg, heightCm, ageYears, biologicalSex) {
    if (!weightKg || !heightCm || !ageYears) return null
    return calculateBmr(weightKg, heightCm, ageYears, biologicalSex)
  }

  /**
   * @param {number} bmr
   * @param {number} palMultiplier
   * @returns {number|null}
   */
  function getTdee(bmr, palMultiplier) {
    if (!bmr || !palMultiplier) return null
    return calculateTdee(bmr, palMultiplier)
  }

  function _propagateTdee() {
    if (!userGoal.value) return
    const cal  = userGoal.value.macroTargets.dailyCalorieTarget
    const prot = userGoal.value.macroTargets.proteinTargetG
    if (!cal) return

    emit(createDomainEvent(GOAL_UPDATED, { dailyCalorieTarget: cal, proteinTargetG: prot }))

    const wKg = latestWeightKg.value
    const hCm = userHeightCm.value
    if (wKg && hCm) {
      const bmiResult = getBmi(wKg, hCm)
      emit(createDomainEvent(WEIGHT_UPDATED, {
        bmiCategory: bmiResult?.category ?? null,
        goalValue:   userGoal.value.goal.value,
      }))
    }
  }

  /** @param {number} heightCm */
  function setUserHeight(heightCm) {
    userHeightCm.value = heightCm
  }

  /**
   * Fetches body metrics to mark the measurement state as loaded.
   * Individual measurement values (waistCm, neckCm) are not returned by the backend
   * in the GET response; they become available locally after createBodyMeasurement.
   * @param {number} userId
   */
  function fetchBodyMeasurements(userId) {
    bodyHealthMetricsApi.getBodyMetrics(userId)
      .then(() => { measurementLoaded.value = true })
      .catch(error => errors.value.push(error))
  }

  /** No-op: individual measurements are not fetchable by ID via the current API. */
  function fetchBodyMeasurement(_id) {
    measurementLoaded.value = true
  }

  /**
   * Updates body measurements for an existing user.
   * @param {number} userId
   * @param {{ waistCm: number, neckCm?: number }} measurementData
   */
  function updateBodyMeasurement(userId, measurementData) {
    const resource = { waistCm: measurementData.waistCm, neckCm: measurementData.neckCm ?? 0 }
    bodyHealthMetricsApi.registerBodyMeasurement(userId, resource)
      .then(() => {
        const now = new Date().toISOString()
        const updated = BodyMeasurement({ id: now, userId: String(userId), ...resource, measuredAt: now })
        bodyMeasurement.value = updated
        bodyMeasurements.value = [updated, ...bodyMeasurements.value]
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads weight history from GET /body-metrics/{userId}/weight-history, sorted most-recent first.
   * @param {number} userId
   */
  function fetchWeightLogs(userId) {
    bodyHealthMetricsApi.getWeightHistory(userId)
      .then(response => {
        weightLogs.value = WeightLogAssembler.toEntitiesFromHistoryResponse(response, userId)
          .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        weightLogsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the current weight, then refreshes the local weight history.
   * The backend persists a new WeightLog record on every PUT.
   * @param {number} userId
   * @param {number} weightKg
   * @param {Date} [_date] - ignored; date is set server-side
   * @returns {Promise<void>}
   */
  function logWeight(userId, weightKg, _date) {
    return bodyHealthMetricsApi.updateWeight(userId, { weightKg, note: null })
      .then(() => bodyHealthMetricsApi.getWeightHistory(userId))
      .then(response => {
        weightLogs.value = WeightLogAssembler.toEntitiesFromHistoryResponse(response, userId)
          .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        _propagateTdee()
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the current weight for a user.
   * Sets `weightSaving` to true while the request is in flight.
   * @param {number} userId
   * @param {number} weightKg
   */
  function updateTodayWeight(userId, weightKg) {
    weightSaving.value = true
    bodyHealthMetricsApi.updateWeight(userId, { weightKg, note: null })
      .then(() => bodyHealthMetricsApi.getWeightHistory(userId))
      .then(response => {
        weightLogs.value = WeightLogAssembler.toEntitiesFromHistoryResponse(response, userId)
          .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        _propagateTdee()
      })
      .catch(error => errors.value.push(error))
      .finally(() => { weightSaving.value = false })
  }

  /**
   * Loads body metrics and maps the active goal to a UserGoal entity.
   * @param {number} userId
   */
  function fetchUserGoal(userId) {
    bodyHealthMetricsApi.getBodyMetrics(userId)
      .then(response => {
        userGoal.value = BodyMetricsAssembler.toUserGoalFromResource(response.data)
        goalLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Registers initial body metrics for a new user (POST /body-metrics).
   * Called once during onboarding after the profile is saved. When `goal` is provided
   * the backend seeds a default active goal (with computed macro targets) in the same
   * request, so no separate goal-setting step is required.
   * @param {{ userId: number, heightCm: number, weightKg: number, dateOfBirth: string, biologicalSex: string, activityLevel: string, goal?: string, weeklyRateKg?: number }} data
   * @returns {Promise<void>}
   */
  function registerBodyMetrics(data) {
    return bodyHealthMetricsApi.registerBodyMetrics(data)
      .then(response => {
        userGoal.value = BodyMetricsAssembler.toUserGoalFromResource(response.data)
        const wKg = response.data.currentWeightKg
        if (wKg) {
          const entry = WeightLogAssembler.toEntityFromHistoryEntry(
            { weightKg: wKg, loggedAt: new Date().toISOString(), note: null },
            data.userId,
          )
          if (entry) weightLogs.value = [entry]
        }
        weightLogsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates an initial body measurement record for a new user.
   * The response is BodyMetricsResource (no measurement fields), so the entity is
   * created locally from the request data.
   * @param {number} userId
   * @param {number} waistCm
   * @param {number} [neckCm]
   */
  function createBodyMeasurement(userId, waistCm, neckCm = 0) {
    bodyHealthMetricsApi.registerBodyMeasurement(userId, { waistCm, neckCm })
      .then(() => {
        const now = new Date().toISOString()
        const created = BodyMeasurement({ id: now, userId: String(userId), waistCm, neckCm, measuredAt: now })
        bodyMeasurements.value.unshift(created)
        bodyMeasurement.value = created
        measurementLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Sets the active health goal for a user.
   * The backend always replaces the previous active goal.
   * @param {number} userId
   * @param {{ goal: string, targetWeightKg: number, weeklyRateKg: number }} goalData
   */
  function saveUserGoal(userId, goalData) {
    bodyHealthMetricsApi.setHealthGoal(userId, goalData)
      .then(response => {
        userGoal.value = BodyMetricsAssembler.toUserGoalFromResource(response.data)
        _propagateTdee()
      })
      .catch(error => errors.value.push(error))
  }

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    bodyMeasurement,
    bodyMeasurements,
    weightLogs,
    userGoal,
    measurementLoaded,
    weightLogsLoaded,
    goalLoaded,
    weightSaving,
    userHeightCm,
    errors,
    weightTrend,
    todayWeightLog,
    latestWeightKg,
    getBmi,
    getBmr,
    getTdee,
    fetchBodyMeasurements,
    fetchBodyMeasurement,
    createBodyMeasurement,
    updateBodyMeasurement,
    registerBodyMetrics,
    fetchWeightLogs,
    logWeight,
    updateTodayWeight,
    fetchUserGoal,
    saveUserGoal,
    setUserHeight,
    clearErrors,
  }
})
