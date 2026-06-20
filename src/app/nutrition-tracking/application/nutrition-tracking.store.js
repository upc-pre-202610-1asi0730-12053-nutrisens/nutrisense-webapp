// PATH: src/app/nutrition-tracking/application/nutrition-tracking.store.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { NutritionTrackingApi } from '../infrastructure/nutrition-tracking.api.js'
import { NutritionLogAssembler } from '../infrastructure/nutrition-log.assembler.js'
import { FoodAssembler } from '../infrastructure/food.assembler.js'
import { Macros } from '../../shared/domain/model/macros.record.js'
import { on, emit } from '../../shared/infrastructure/event-bus.js'
import { createDomainEvent } from '../../shared/domain/events/domain-event.js'
import { NUTRITION_LOG_ADDED, GOAL_UPDATED } from '../../shared/domain/events/event-types.js'
import { toLocalDateString } from '../../shared/infrastructure/date-utils.js'
import { conflictingFlags } from '../domain/services/food-restriction.service.js'
import { isStreakDayMet } from '../domain/services/streak-criteria.service.js'
import i18n from '../../../i18n.js'

const nutritionTrackingApi = new NutritionTrackingApi()

/**
 * Store for nutrition logs, food catalogue, and daily macro tracking.
 */
export const useNutritionTrackingStore = defineStore('nutrition-tracking', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/nutrition-log.entity.js').NutritionLog>[]>} */
  const logs = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/food.entity.js').Food>[]>} */
  const foods = ref([])
  const selectedDate = ref(new Date())
  const logsLoaded = ref(false)
  /** Tracks the last userId used to fetch logs so date changes can re-fetch automatically. */
  const _currentUserId = ref('')
  const scanDishLoading = ref(false)
  const scanMenuLoading = ref(false)
  /**
   * @type {import('vue').Ref<{
   *   imageName: string,
   *   detectedItems: Array<{food: ReturnType<import('../domain/model/food.entity.js').Food>, estimatedGrams: number, confidence: number}>,
   *   totalMacros: ReturnType<typeof Macros>
   * }|null>}
   */
  const dishScanResult = ref(null)
  /**
   * @type {import('vue').Ref<{
   *   imageName: string,
   *   recommendations: Array<{food: ReturnType<import('../domain/model/food.entity.js').Food>, score: number, flags: string[], isSafe: boolean}>
   * }|null>}
   */
  const menuScanResult = ref(null)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])
  /** @type {import('vue').Ref<number>} */
  const calorieGoal = ref(2000)
  /** @type {import('vue').Ref<number>} */
  const proteinGoal = ref(0)

  /**
   * Logs for the currently selected date.
   * The server already filters by date, so this is a direct passthrough.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/nutrition-log.entity.js').NutritionLog>[]>}
   */
  const logsForSelectedDate = computed(() => logs.value)

  /**
   * Logs grouped by meal type for the selected date.
   * @type {import('vue').ComputedRef<Record<string, ReturnType<import('../domain/model/nutrition-log.entity.js').NutritionLog>[]>>}
   */
  const logsByMealType = computed(() => ({
    breakfast: logsForSelectedDate.value.filter(l => l.mealType.value === 'breakfast'),
    lunch:     logsForSelectedDate.value.filter(l => l.mealType.value === 'lunch'),
    snack:     logsForSelectedDate.value.filter(l => l.mealType.value === 'snack'),
    dinner:    logsForSelectedDate.value.filter(l => l.mealType.value === 'dinner'),
  }))

  /**
   * Total calories consumed on the selected date.
   * @type {import('vue').ComputedRef<number>}
   */
  const dailyCaloriesConsumed = computed(() =>
    logsForSelectedDate.value.reduce((sum, l) => sum + l.macros().calories, 0)
  )

  /**
   * Aggregated macros consumed on the selected date.
   * @type {import('vue').ComputedRef<ReturnType<typeof Macros>>}
   */
  const dailyMacros = computed(() => {
    const zero = Macros({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
    return logsForSelectedDate.value.reduce((acc, l) => acc.add(l.macros()), zero)
  })

  /**
   * Up to 5 unique food IDs from the most recent logs.
   * @type {import('vue').ComputedRef<string[]>}
   */
  const recentFoodIds = computed(() => {
    const seen = new Set()
    return [...logs.value]
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .filter(l => { if (seen.has(l.foodId)) return false; seen.add(l.foodId); return true })
      .slice(0, 5)
      .map(l => l.foodId)
  })

  /**
   * Whether the selected date is today.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isViewingToday = computed(() =>
    toLocalDateString(selectedDate.value) === toLocalDateString()
  )

  /** Fires all cross-BC policies that react to a consumption change. */
  function _onConsumptionUpdated() {
    emit(createDomainEvent(NUTRITION_LOG_ADDED, {
      logEntries: logs.value.map(l => ({
        date:      l.date,
        mealType:  l.mealType.value,
        calories:  l.macros().calories,
        proteinG:  l.macros().proteinG,
      })),
      calorieGoal: calorieGoal.value,
      proteinGoal: proteinGoal.value,
      dailyMacros: {
        calories: dailyMacros.value.calories,
        proteinG: dailyMacros.value.proteinG,
      },
    }))
  }

  on(GOAL_UPDATED, ({ dailyCalorieTarget, proteinTargetG }) => {
    calorieGoal.value = dailyCalorieTarget
    proteinGoal.value = proteinTargetG
  })

  /**
   * Sets the calorie and protein goals used for streak calculation.
   * Call this from the view whenever user goals are loaded or change.
   * @param {number} cal
   * @param {number} prot
   */
  function setGoals(cal, prot) {
    calorieGoal.value = cal
    proteinGoal.value = prot
  }

  /**
   * Loads nutrition logs for a given user on the currently selected date.
   * Captures userId so that date changes trigger an automatic re-fetch.
   * @param {string|number} userId
   */
  function fetchLogs(userId) {
    _currentUserId.value = String(userId)
    const date = toLocalDateString(selectedDate.value)
    nutritionTrackingApi.getLogsByUserAndDate(userId, date)
      .then(response => {
        logs.value = NutritionLogAssembler.toEntitiesFromResponse(response)
        logsLoaded.value = true
        _onConsumptionUpdated()
      })
      .catch(error => errors.value.push(error))
  }

  watch(selectedDate, () => {
    if (_currentUserId.value) fetchLogs(_currentUserId.value)
  })

  /**
   * Searches the food catalogue by query string.
   * Populates `foods` with results (used by scan simulations and the search dialog).
   * @param {string} query
   * @param {string} [language]
   * @returns {Promise<ReturnType<import('../domain/model/food.entity.js').Food>[]>}
   */
  function searchFoods(query, language = 'en') {
    return nutritionTrackingApi.searchFoods(query, language)
      .then(response => {
        foods.value = FoodAssembler.toEntitiesFromResponse(response, language)
        return foods.value
      })
      .catch(error => { errors.value.push(error); return [] })
  }

  /**
   * Creates a nutrition log entry for a food.
   * @param {string} userId
   * @param {string} foodId
   * @param {number} grams
   * @param {string} mealTypeName
   * @param {string} sourceName
   */
  function addToLog(userId, foodId, grams, mealTypeName, sourceName) {
    const resource = NutritionLogAssembler.toResource(
      userId, foodId, grams, mealTypeName, sourceName, toLocalDateString(selectedDate.value),
    )

    nutritionTrackingApi.createLog(resource)
      .then(response => {
        const newLog = NutritionLogAssembler.toEntityFromResponse(response)
        if (newLog) logs.value.push(newLog)
        _onConsumptionUpdated()
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Logs a recommendation using its estimated macros when no food catalog entry exists.
   * @param {string} userId
   * @param {string|null} foodId
   * @param {string} customFoodName
   * @param {{calories:number, proteinG:number, carbsG:number, fatG:number}} macros
   * @param {string} mealTypeName
   * @param {string} sourceName
   */
  function addEstimatedToLog(userId, foodId, customFoodName, macros, mealTypeName, sourceName) {
    const resource = NutritionLogAssembler.toResourceFromEstimate(
      userId, foodId, customFoodName, macros, mealTypeName, sourceName, toLocalDateString(selectedDate.value),
    )
    nutritionTrackingApi.createLog(resource)
      .then(response => {
        const newLog = NutritionLogAssembler.toEntityFromResponse(response)
        if (newLog) logs.value.push(newLog)
        _onConsumptionUpdated()
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the quantity of an existing log entry and recomputes its macros.
   * @param {string} logId
   * @param {number} newGrams
   */
  function updateLogQuantity(logId, newGrams) {
    const log = logs.value.find(l => l.id === logId)
    if (!log) return
    nutritionTrackingApi.updateLog(logId, {
      userId:    log.userId,
      quantityG: newGrams,
    })
      .then(response => {
        const updated = NutritionLogAssembler.toEntityFromResponse(response)
        if (updated) logs.value = logs.value.map(l => l.id === logId ? updated : l)
        _onConsumptionUpdated()
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes a nutrition log entry by ID.
   * @param {string} logId
   */
  function removeFromLog(logId) {
    return nutritionTrackingApi.deleteLog(logId)
      .then(() => {
        logs.value = logs.value.filter(l => l.id !== logId)
        _onConsumptionUpdated()
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Sets the currently viewed date.
   * @param {Date} date
   */
  function setSelectedDate(date) {
    selectedDate.value = date
  }

  /**
   * Moves the selected date by offset days.
   * Does not navigate to future dates or before `minDate` when provided.
   * @param {-1 | 1} offset
   * @param {Date|null} [minDate] - earliest allowed date (inclusive)
   */
  function navigateDay(offset, minDate = null) {
    const newDate = new Date(selectedDate.value)
    newDate.setDate(newDate.getDate() + offset)
    if (offset > 0 && newDate > new Date()) return
    if (offset < 0 && minDate && newDate < minDate) return
    selectedDate.value = newDate
  }

  /**
   * Returns logs within a date range for analytics consumers.
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {ReturnType<import('../domain/model/nutrition-log.entity.js').NutritionLog>[]}
   */
  function getLogsForDateRange(startDate, endDate) {
    return logs.value.filter(l => {
      const d = new Date(l.loggedAt)
      return d >= startDate && d <= endDate
    })
  }

  /**
   * Maps a backend scan item (dish item / menu option) to a Food entity. AI-estimated items don't
   * carry fiber/sugar, so those default to 0; `key` is set to the English name so the UI shows a
   * readable label when no i18n translation exists.
   * @param {Object} item
   * @returns {ReturnType<import('../domain/model/food.entity.js').Food>|null}
   */
  function _scanItemToFood(item) {
    const locale = i18n.global.locale.value
    return FoodAssembler.toEntityFromResource({
      id: item.foodId,
      key: item.nameEn,
      nameEn: item.nameEn,
      nameEs: item.nameEs,
      source: item.isEstimate ? 'ai-estimate' : 'catalog',
      externalId: null,
      servingSizeG: 100,
      servingUnit: 'g',
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      fiberPer100g: item.fiberPer100g ?? 0,
      sugarPer100g: item.sugarPer100g ?? 0,
      restrictions: item.restrictions ?? [],
    }, locale)
  }

  /**
   * Scans a dish photo via the backend (Gemini + DeepSeek), resolving each detected item to a food
   * and aggregating its macros. An empty `detectedItems` list signals the "no dishes detected"
   * fallback to the result view.
   * @param {string} userId
   * @param {string} imageName
   * @param {string} imageBase64OrUri
   * @returns {Promise<void>}
   */
  async function scanDish(userId, imageName, imageBase64OrUri) {
    scanDishLoading.value = true
    dishScanResult.value  = null
    try {
      const response = await nutritionTrackingApi.scanDish(userId, imageBase64OrUri)
      const items = Array.isArray(response.data?.items) ? response.data.items : []
      const detectedItems = items
        .map(item => {
          const food = _scanItemToFood(item)
          if (!food) return null
          return {
            food,
            estimatedGrams: Math.round(item.estimatedQuantityG ?? 100),
            confidence: item.isEstimate ? 0.75 : 1,
          }
        })
        .filter(Boolean)
      const zero        = Macros({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
      const totalMacros = detectedItems.reduce(
        (acc, { food, estimatedGrams }) => acc.add(food.macrosForQuantity(estimatedGrams)),
        zero,
      )
      dishScanResult.value = { imageName, detectedItems, totalMacros }
    } catch (error) {
      errors.value.push(error)
      throw error
    } finally {
      scanDishLoading.value = false
    }
  }

  /**
   * Scans a menu photo via the backend (Gemini + DeepSeek), resolving each dish to a food and
   * ranking the options by restriction safety and health score. An empty `recommendations` list
   * signals the "no menu detected" fallback to the result view.
   * @param {string} userId
   * @param {string} imageName
   * @param {string} imageBase64OrUri
   * @param {string[]} dietaryRestrictions
   * @param {string[]} medicalConditions
   * @returns {Promise<void>}
   */
  async function scanMenu(userId, imageName, imageBase64OrUri, dietaryRestrictions, medicalConditions) {
    scanMenuLoading.value = true
    menuScanResult.value  = null
    try {
      const response = await nutritionTrackingApi.scanMenu(userId, imageBase64OrUri)
      const options = Array.isArray(response.data?.options) ? response.data.options : []
      const recommendations = options
        .map(option => {
          const food = _scanItemToFood(option)
          if (!food) return null
          const flags = conflictingFlags(food, dietaryRestrictions, medicalConditions)
          return { food, score: food.healthScore(), flags, isSafe: flags.length === 0 }
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.isSafe !== b.isSafe) return a.isSafe ? -1 : 1
          return b.score - a.score
        })
      menuScanResult.value = { imageName, recommendations }
    } catch (error) {
      errors.value.push(error)
      throw error
    } finally {
      scanMenuLoading.value = false
    }
  }

  /** Resets dish scan state to allow a new scan. */
  function resetDishScan() {
    dishScanResult.value  = null
    scanDishLoading.value = false
  }

  /**
   * Creates a nutrition log entry from a recipe's scaled macros.
   * Uses `source: 'recipe'` and does not require a food-catalog lookup.
   * @param {string} userId
   * @param {ReturnType<import('../../../smart-recommendations/domain/model/recipe.entity.js').Recipe>} recipe
   * @param {number} servings
   * @param {string} mealTypeName
   */
  function addRecipeToLog(userId, recipe, servings, mealTypeName) {
    const resource = NutritionLogAssembler.toResourceFromRecipe(
      userId, recipe, servings, mealTypeName, toLocalDateString(selectedDate.value),
    )
    nutritionTrackingApi.createLog(resource)
      .then(response => {
        const newLog = NutritionLogAssembler.toEntityFromResponse(response)
        if (newLog) logs.value.push(newLog)
        _onConsumptionUpdated()
      })
      .catch(error => errors.value.push(error))
  }

  /** Resets menu scan state to allow a new scan. */
  function resetMenuScan() {
    menuScanResult.value  = null
    scanMenuLoading.value = false
  }

  /**
   * Evaluates whether today's log meets streak criteria.
   * Guards against past-date views before delegating to the domain service.
   * @param {number} calorieGoal
   * @param {number} proteinGoal
   * @returns {boolean}
   */
  function evaluateStreakMet(calorieGoal, proteinGoal) {
    if (!isViewingToday.value) return false
    return isStreakDayMet({
      dailyCaloriesConsumed: dailyCaloriesConsumed.value,
      calorieGoal,
      logsByMealType: logsByMealType.value,
      dailyMacros: dailyMacros.value,
      proteinGoal,
    })
  }

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    logs,
    foods,
    selectedDate,
    logsLoaded,
    scanDishLoading,
    scanMenuLoading,
    dishScanResult,
    menuScanResult,
    errors,
    logsForSelectedDate,
    logsByMealType,
    dailyCaloriesConsumed,
    dailyMacros,
    recentFoodIds,
    isViewingToday,
    fetchLogs,
    searchFoods,
    addToLog,
    addEstimatedToLog,
    addRecipeToLog,
    updateLogQuantity,
    removeFromLog,
    scanDish,
    scanMenu,
    resetDishScan,
    resetMenuScan,
    setSelectedDate,
    navigateDay,
    getLogsForDateRange,
    evaluateStreakMet,
    setGoals,
    clearErrors,
  }
})