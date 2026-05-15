// PATH: src/app/body-health-metrics/application/body-health-metrics.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BodyHealthMetricsApi } from '../infrastructure/body-health-metrics.api.js'
import { BodyMeasurementAssembler } from '../infrastructure/body-measurement.assembler.js'
import { WeightLogAssembler } from '../infrastructure/weight-log.assembler.js'
import { UserGoalAssembler } from '../infrastructure/user-goal.assembler.js'
import { calculateBmi, calculateBmr, calculateTdee } from '../domain/services/body-metrics.service.js'
import { on, emit } from '../../shared/infrastructure/event-bus.js'
import { createDomainEvent } from '../../shared/domain/events/domain-event.js'
import { GOAL_UPDATED, WEIGHT_UPDATED } from '../../shared/domain/events/event-types.js'

const bodyHealthMetricsApi = new BodyHealthMetricsApi()

/**
 * Store for body measurements, weight logs, and user goals.
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
   * Calculates BMI for given weight and height.
   * @param {number} weightKg
   * @param {number} heightCm
   * @returns {ReturnType<import('../domain/model/bmi-result.record.js').BmiResult>|null}
   */
  function getBmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null
    return calculateBmi(weightKg, heightCm)
  }

  /**
   * Calculates BMR using Mifflin-St Jeor.
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
   * Calculates TDEE from BMR and PAL multiplier.
   * @param {number} bmr
   * @param {number} palMultiplier
   * @returns {number|null}
   */
  function getTdee(bmr, palMultiplier) {
    if (!bmr || !palMultiplier) return null
    return calculateTdee(bmr, palMultiplier)
  }

  /**
   * Emits goal and weight domain events so dependent BCs can react.
   * Called after any mutation that may change TDEE or BMI (goal save, weight log).
   */
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

  /**
   * Stores the user's height so BMI can be computed without depending on the IAM context.
   * Call this from the view after the current user is available.
   * @param {number} heightCm
   */
  function setUserHeight(heightCm) {
    userHeightCm.value = heightCm
  }

  /**
   * Loads all body measurements for a given user.
   * @param {string} userId
   */
  function fetchBodyMeasurements(userId) {
    bodyHealthMetricsApi.getBodyMeasurements()
      .then(response => {
        const all = BodyMeasurementAssembler.toEntitiesFromResponse(response)
        bodyMeasurements.value = all.filter(m => m.userId === userId)
        bodyMeasurement.value = bodyMeasurements.value[0] ?? null
        measurementLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads a single body measurement by ID.
   * @param {string} id
   */
  function fetchBodyMeasurement(id) {
    bodyHealthMetricsApi.getBodyMeasurement(id)
      .then(response => {
        bodyMeasurement.value = BodyMeasurementAssembler.toEntityFromResponse(response)
        measurementLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the current body measurement record.
   * @param {Object} measurementData
   */
  function updateBodyMeasurement(measurementData) {
    if (!bodyMeasurement.value) return
    bodyHealthMetricsApi.updateBodyMeasurement(bodyMeasurement.value.id, measurementData)
      .then(response => {
        bodyMeasurement.value = BodyMeasurementAssembler.toEntityFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads all weight logs for a given user, sorted most-recent first.
   * @param {string} userId
   */
  function fetchWeightLogs(userId) {
    bodyHealthMetricsApi.getWeightLogs()
      .then(response => {
        const all = WeightLogAssembler.toEntitiesFromResponse(response)
        weightLogs.value = all
          .filter(l => l.userId === userId)
          .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        weightLogsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates a new weight log entry, prepended to the list.
   * @param {string} userId
   * @param {number} weightKg
   * @param {Date} date
   * @returns {Promise<void>}
   */
  function logWeight(userId, weightKg, date) {
    const resource = { userId, weightKg, loggedAt: date.toISOString(), note: null }
    return bodyHealthMetricsApi.createWeightLog(resource)
      .then(response => {
        const newLog = WeightLogAssembler.toEntityFromResource(response.data)
        if (newLog) weightLogs.value.unshift(newLog)
        _propagateTdee()
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates today's weight log if it exists, or creates a new one.
   * Sets `weightSaving` to true while the request is in flight.
   * @param {string} userId
   * @param {number} weightKg
   */
  function updateTodayWeight(userId, weightKg) {
    weightSaving.value = true
    if (todayWeightLog.value) {
      const itemId = todayWeightLog.value.id
      bodyHealthMetricsApi.updateWeightLog(itemId, { weightKg })
        .then(response => {
          const updated = WeightLogAssembler.toEntityFromResource(response.data)
          const idx = weightLogs.value.findIndex(l => l.id === itemId)
          if (idx !== -1 && updated) weightLogs.value.splice(idx, 1, updated)
        })
        .catch(error => errors.value.push(error))
        .finally(() => { weightSaving.value = false })
    } else {
      logWeight(userId, weightKg, new Date())
        .finally(() => { weightSaving.value = false })
    }
  }

  /**
   * Loads user goals and sets the active one.
   * @param {string} userId
   */
  function fetchUserGoal(userId) {
    bodyHealthMetricsApi.getUserGoals()
      .then(response => {
        const all = UserGoalAssembler.toEntitiesFromResponse(response)
        userGoal.value = all.find(g => g.userId === userId && g.isActive()) ?? null
        goalLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates an initial body measurement record for a new user.
   * @param {string} userId
   * @param {number} waistCm
   */
  function createBodyMeasurement(userId, waistCm) {
    const resource = {
      userId,
      waistCm,
      neckCm: 0,
      measuredAt: new Date().toISOString(),
    }
    bodyHealthMetricsApi.createBodyMeasurement(resource)
      .then(response => {
        const created = BodyMeasurementAssembler.toEntityFromResource(response.data)
        if (created) {
          bodyMeasurements.value.unshift(created)
          bodyMeasurement.value = created
        }
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates or updates the user goal.
   * @param {string} userId
   * @param {{ goal: string, targetWeightKg: number, weeklyRateKg: number }} goalData
   */
  function saveUserGoal(userId, goalData) {
    if (userGoal.value) {
      bodyHealthMetricsApi.updateUserGoal(userGoal.value.id, goalData)
        .then(response => {
          userGoal.value = UserGoalAssembler.toEntityFromResource(response.data)
          _propagateTdee()
        })
        .catch(error => errors.value.push(error))
    } else {
      bodyHealthMetricsApi.createUserGoal({ ...goalData, userId, active: true })
        .then(response => {
          userGoal.value = UserGoalAssembler.toEntityFromResource(response.data)
          _propagateTdee()
        })
        .catch(error => errors.value.push(error))
    }
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
    fetchWeightLogs,
    logWeight,
    updateTodayWeight,
    fetchUserGoal,
    saveUserGoal,
    setUserHeight,
    clearErrors,
  }
})
