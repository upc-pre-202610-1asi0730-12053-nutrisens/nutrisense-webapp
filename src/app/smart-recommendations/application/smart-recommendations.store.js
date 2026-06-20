// PATH: src/app/smart-recommendations/application/smart-recommendations.store.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { SmartRecommendationsApi } from '../infrastructure/smart-recommendations.api.js'
import { RecommendationCardAssembler } from '../infrastructure/recommendation-card.assembler.js'
import { RecipeAssembler } from '../infrastructure/recipe.assembler.js'
import { PantryItemAssembler } from '../infrastructure/pantry-item.assembler.js'
import { CityAssembler } from '../infrastructure/city.assembler.js'
import { WeatherAssembler } from '../infrastructure/weather.assembler.js'
import { IngredientCatalogItemAssembler } from '../infrastructure/ingredient-catalog-item.assembler.js'
import { MacroProfile } from '../domain/model/macro-profile.entity.js'
import { CONFLICT_TAGS } from '../../iam/domain/model/dietary-restriction.entity.js'
import { on } from '../../shared/infrastructure/event-bus.js'
import { NUTRITION_LOG_ADDED, WEIGHT_UPDATED } from '../../shared/domain/events/event-types.js'

const smartRecommendationsApi = new SmartRecommendationsApi()

const MEDICAL_CONDITION_TAGS = {
  'coeliac-disease': ['gluten'],
  'gout': ['seafood', 'fish'],
}

export const useSmartRecommendationsStore = defineStore('smart-recommendations', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/recommendation-card.entity.js').RecommendationCard>[]>} */
  const recommendations = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/recipe.entity.js').Recipe>[]>} */
  const recipes = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/pantry-item.entity.js').PantryItem>[]>} */
  const pantryItems = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/city.entity.js').City>[]>} */
  const cities = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/ingredient-catalog-item.entity.js').IngredientCatalogItem>[]>} */
  const ingredientCatalog = ref([])
  /**
   * Cache of current-weather snapshots keyed by city ID.
   * @type {import('vue').Ref<Record<number, ReturnType<import('../domain/model/weather.record.js').Weather>>>}
   */
  const weatherByCity = ref({})
  const travelModeActive = ref(false)
  /** @type {import('vue').Ref<number|string|null>} */
  const homeCityId = ref(null)
  const homeCityName = ref('')
  /** @type {import('vue').Ref<number|string|null>} */
  const travelCityId = ref(null)
  const travelCityName = ref('')
  /** GPS-detected current city (persisted server-side via /detect). @type {import('vue').Ref<number|string|null>} */
  const currentCityId = ref(null)
  const currentCityName = ref('')
  /** @type {import('vue').Ref<import('../../../shared/domain/model/goal-type.record.js').GoalTypeValue|null>} */
  const userGoal = ref(null)
  const activeFilters = ref({
    maxKcal: /** @type {number|null} */ (null),
    /** @type {'protein'|'carbs'|'fat'|null} */
    highInMacro: null,
    /** @type {Array<'recommendations'|'recipes'>} */
    sources: [],
    citySource: /** @type {'current'|'home'} */ ('current'),
  })
  const recommendationsLoaded = ref(false)
  const pantryLoaded = ref(false)
  /** @type {import('vue').Ref<ReturnType<typeof MacroProfile>|null>} */
  const macroProfile = ref(null)
  const profileFilterActive = ref(true)
  /** @type {import('vue').Ref<number>} */
  const consumedCaloriesToday = ref(0)
  /** @type {import('vue').Ref<number>} */
  const consumedProteinToday = ref(0)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])
  /** @type {import('vue').Ref<string[]>} */
  const userRestrictions = ref([])
  /** @type {import('vue').Ref<string[]>} */
  const userMedicalConditions = ref([])
  /** Persisted to pass userId into pantry mutations that lack it as a parameter. */
  const pantryUserId = ref(/** @type {string|number|null} */ (null))

  /**
   * Flat set of food tags forbidden by the user's restrictions and medical conditions.
   * @type {import('vue').ComputedRef<string[]>}
   */
  const userForbiddenTags = computed(() => {
    const allKeys = [...userRestrictions.value, ...userMedicalConditions.value]
    const tags = new Set()
    for (const key of allKeys) {
      for (const tag of CONFLICT_TAGS[key] ?? []) tags.add(tag)
      for (const tag of MEDICAL_CONDITION_TAGS[key] ?? []) tags.add(tag)
    }
    return [...tags]
  })

  /**
   * Active city ID respecting both travel mode and the citySource filter.
   * @type {import('vue').ComputedRef<number|string|null>}
   */
  const activeCityId = computed(() => {
    if (activeFilters.value.citySource === 'home') return homeCityId.value
    if (travelModeActive.value) return travelCityId.value
    return currentCityId.value ?? homeCityId.value
  })

  /**
   * Home city entity, resolved from the loaded cities list.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/city.entity.js').City>|null>}
   */
  const homeCity = computed(() =>
    cities.value.find(c => c.id === homeCityId.value) ?? null
  )

  /**
   * Active city display name, consistent with activeCityId resolution.
   * @type {import('vue').ComputedRef<string>}
   */
  const activeCityName = computed(() => {
    if (activeFilters.value.citySource === 'home') return homeCityName.value
    if (travelModeActive.value) return travelCityName.value
    return currentCityName.value || homeCityName.value
  })

  /**
   * Current active city entity, if loaded.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/city.entity.js').City>|null>}
   */
  const activeCity = computed(() =>
    cities.value.find(c => c.id === activeCityId.value) ?? null
  )

  /**
   * Current-weather snapshot for the active city, if already fetched.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/weather.record.js').Weather>|null>}
   */
  const currentWeather = computed(() =>
    activeCityId.value != null ? weatherByCity.value[activeCityId.value] ?? null : null
  )

  /**
   * Recommendations filtered by source, macro focus and max kcal.
   * The backend already personalizes recommendations per user; no city/goal filter is applied client-side.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/recommendation-card.entity.js').RecommendationCard>[]>}
   */
  const filteredRecommendations = computed(() => {
    const showRecs = !activeFilters.value.sources.length
      || activeFilters.value.sources.includes('recommendations')
    if (!showRecs) return []

    let result = recommendations.value

    if (activeFilters.value.maxKcal !== null)
      result = result.filter(r => r.estimatedCalories <= activeFilters.value.maxKcal)

    if (activeFilters.value.highInMacro === 'protein')
      result = result.filter(r => r.estimatedProteinG >= 25)
    else if (activeFilters.value.highInMacro === 'carbs')
      result = result.filter(r => r.estimatedCarbsG >= 40)
    else if (activeFilters.value.highInMacro === 'fat')
      result = result.filter(r => r.estimatedFatG >= 12)

    if (profileFilterActive.value && macroProfile.value) {
      result = [...result].sort((a, b) =>
        MacroProfile.score(b.estimatedCalories, b.estimatedProteinG ?? 0, macroProfile.value)
        - MacroProfile.score(a.estimatedCalories, a.estimatedProteinG ?? 0, macroProfile.value)
      )
    }

    return result
  })

  /**
   * Ingredient IDs currently in the pantry.
   * @type {import('vue').ComputedRef<number[]>}
   */
  const pantryIngredientIds = computed(() =>
    pantryItems.value.map(p => p.ingredientId)
  )

  /**
   * Recipes that can be made with pantry contents (≥ 70% ingredient match).
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/recipe.entity.js').Recipe>[]>}
   */
  const suggestedRecipes = computed(() =>
    recipes.value.filter(r => r.matchesPantry(pantryIngredientIds.value))
  )

  /**
   * Recipes with partial pantry match (30%–70%).
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/recipe.entity.js').Recipe>[]>}
   */
  const partialMatchRecipes = computed(() =>
    recipes.value.filter(r => {
      const total = r.ingredients.length
      if (total === 0) return false
      const missing = r.missingIngredients(pantryIngredientIds.value).length
      const score = (total - missing) / total
      return score >= 0.3 && score < 0.7
    })
  )

  /**
   * Combined, goal-filtered and macro-filtered recipe feed.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/recipe.entity.js').Recipe>[]>}
   */
  const feedRecipes = computed(() => {
    const showRecipes = !activeFilters.value.sources.length
      || activeFilters.value.sources.includes('recipes')
    if (!showRecipes) return []

    let result = [...suggestedRecipes.value, ...partialMatchRecipes.value]

    if (userGoal.value)
      result = result.filter(r => r.matchesGoal(userGoal.value))

    if (activeFilters.value.maxKcal !== null)
      result = result.filter(r => r.totalMacros.calories <= activeFilters.value.maxKcal)

    if (activeFilters.value.highInMacro === 'protein')
      result = result.filter(r => r.totalMacros.proteinG >= 25)
    else if (activeFilters.value.highInMacro === 'carbs')
      result = result.filter(r => r.totalMacros.carbsG >= 40)
    else if (activeFilters.value.highInMacro === 'fat')
      result = result.filter(r => r.totalMacros.fatG >= 12)

    if (profileFilterActive.value && macroProfile.value) {
      result = [...result].sort((a, b) =>
        MacroProfile.score(b.totalMacros.calories, b.totalMacros.proteinG, macroProfile.value)
        - MacroProfile.score(a.totalMacros.calories, a.totalMacros.proteinG, macroProfile.value)
      )
    }

    return result
  })

  /**
   * Loads recommendation cards for a specific user.
   * @param {string|number} userId
   */
  function fetchRecommendations(userId) {
    smartRecommendationsApi.getRecommendationsByUser(userId)
      .then(response => {
        recommendations.value = RecommendationCardAssembler.toEntitiesFromResponse(response)
        recommendationsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads all recipes, optionally filtered by goal.
   * @param {string} [goal]
   */
  function fetchRecipes(goal) {
    smartRecommendationsApi.getRecipes(goal)
      .then(response => {
        recipes.value = RecipeAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads pantry items for a given user.
   * @param {string|number} userId
   */
  function fetchPantry(userId) {
    pantryUserId.value = userId
    smartRecommendationsApi.getPantryByUser(userId)
      .then(response => {
        pantryItems.value = response.data
          ? PantryItemAssembler.toEntitiesFromResponse(response)
          : []
        pantryLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Adds a single ingredient to the pantry.
   * @param {string|number} userId
   * @param {number} ingredientCatalogItemId
   * @param {number} quantity
   * @param {string} unit
   */
  function addToPantry(userId, ingredientCatalogItemId, quantity, unit) {
    pantryUserId.value = userId
    smartRecommendationsApi.registerPantryItems(userId, [{ ingredientCatalogItemId, quantity, unit }])
      .then(response => {
        pantryItems.value = PantryItemAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes a pantry item by ID.
   * @param {number} itemId
   */
  function removeFromPantry(itemId) {
    const userId = pantryUserId.value
    if (!userId) return
    smartRecommendationsApi.deletePantryItem(userId, itemId)
      .then(() => {
        pantryItems.value = pantryItems.value.filter(p => p.id !== itemId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the quantity of an existing pantry item.
   * @param {number} itemId
   * @param {number} quantity
   */
  function updatePantryQuantity(itemId, quantity) {
    const userId = pantryUserId.value
    if (!userId) return
    const item = pantryItems.value.find(p => p.id === itemId)
    if (!item) return
    smartRecommendationsApi.patchPantryItem(userId, itemId, { quantity, unit: item.unit })
      .then(response => {
        pantryItems.value = PantryItemAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads all cities.
   */
  function fetchCities() {
    smartRecommendationsApi.getCities()
      .then(response => {
        cities.value = CityAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads the current weather for a city (cached per city ID).
   * @param {number|string|null} cityId
   * @param {boolean} [force] - re-fetch even if a snapshot is already cached
   */
  function fetchWeather(cityId, force = false) {
    if (cityId == null) return
    const id = Number(cityId)
    if (!force && weatherByCity.value[id]) return
    smartRecommendationsApi.getWeatherByCity(id)
      .then(response => {
        const weather = WeatherAssembler.toEntityFromResponse(response)
        if (weather) weatherByCity.value = { ...weatherByCity.value, [id]: weather }
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Searches cities by name; returns merged local + geocoding candidates.
   * Candidates not yet in the catalog have `id === null`.
   * @param {string} q
   * @param {number} [limit]
   * @returns {Promise<Object[]>}
   */
  function searchCities(q, limit = 5) {
    return smartRecommendationsApi.searchCities(q, limit)
      .then(response => Array.isArray(response.data) ? response.data : [])
      .catch(error => { errors.value.push(error); return [] })
  }

  /**
   * Ensures a city exists in the catalog. If the result already has an `id`, returns it as-is;
   * otherwise imports it via the backend and caches it in the local `cities` list.
   * @param {Object} result - a city search result (may lack an id)
   * @returns {Promise<{ id: number, nameEs: string, nameEn: string }|null>}
   */
  function importCity(result) {
    if (result?.id != null) {
      return Promise.resolve(result)
    }
    return smartRecommendationsApi.importCity({
      name: result.nameEn ?? result.nameEs,
      nameEn: result.nameEn,
      nameEs: result.nameEs,
      country: result.country,
      lat: result.lat,
      lng: result.lng,
    })
      .then(response => {
        const city = CityAssembler.toEntityFromResponse(response)
        if (city && !cities.value.some(c => c.id === city.id)) {
          cities.value = [...cities.value, city]
        }
        return city
      })
      .catch(error => { errors.value.push(error); return null })
  }

  /**
   * Detects and persists the user's current city from GPS coordinates.
   * Refreshes the catalog (the detected city may have been imported) and recommendations.
   * @param {string|number} userId
   * @param {number} lat
   * @param {number} lng
   */
  function detectLocation(userId, lat, lng) {
    smartRecommendationsApi.detectLocation(userId, lat, lng)
      .then(async response => {
        const detectedId = response.data?.currentCityId
        if (detectedId == null) return
        // The detected city may be freshly imported and absent from the local list.
        if (!cities.value.some(c => c.id === detectedId)) {
          await smartRecommendationsApi.getCities()
            .then(res => { cities.value = CityAssembler.toEntitiesFromResponse(res) })
            .catch(() => {})
        }
        const city = cities.value.find(c => c.id === detectedId)
        currentCityId.value = detectedId
        currentCityName.value = city ? (city.nameEs || city.nameEn) : ''
        fetchRecommendations(userId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads the ingredient catalogue.
   */
  function fetchIngredientCatalog() {
    smartRecommendationsApi.getIngredientCatalog()
      .then(response => {
        ingredientCatalog.value = IngredientCatalogItemAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Merges a partial filters object into the active filters.
   * @param {Partial<typeof activeFilters.value>} filtersPatch
   */
  function setFilters(filtersPatch) {
    activeFilters.value = { ...activeFilters.value, ...filtersPatch }
  }

  /**
   * Resets all active filters to their defaults.
   */
  function clearFilters() {
    activeFilters.value = {
      maxKcal: null,
      highInMacro: null,
      sources: [],
      citySource: 'current',
    }
  }

  /**
   * Sets the user's nutrition goal for goal-aware filtering.
   * @param {import('../../../shared/domain/model/goal-type.record.js').GoalTypeValue|null} goalValue
   */
  function setUserGoal(goalValue) {
    userGoal.value = goalValue
  }

  /**
   * Derives and stores a MacroProfile from BMI category and primary goal.
   * @param {import('../domain/model/macro-profile.entity.js').BmiCategory|null} bmiCategory
   * @param {string|null} primaryGoal
   */
  function setMacroProfile(bmiCategory, primaryGoal) {
    macroProfile.value = MacroProfile.fromBmiAndGoal(bmiCategory, primaryGoal)
  }

  /** Toggles profile-based boost sorting on or off. */
  function toggleProfileFilter() {
    profileFilterActive.value = !profileFilterActive.value
  }

  /**
   * @param {{ calories: number, proteinG: number }} consumed
   */
  function onConsumptionUpdated(consumed) {
    consumedCaloriesToday.value = consumed.calories ?? 0
    consumedProteinToday.value = consumed.proteinG ?? 0
  }

  /**
   * Sets the user's home city.
   * @param {number|string} cityId
   * @param {string} cityName
   */
  function setHomeCity(cityId, cityName) {
    homeCityId.value = cityId
    homeCityName.value = cityName
  }

  /**
   * Activates travel mode with a different city. Persists it server-side (which regenerates the
   * user's recommendations for that city) and then refreshes the feed.
   * @param {string|number} userId
   * @param {number|string} cityId
   * @param {string} cityName
   * @returns {Promise<void>}
   */
  function enableTravelMode(userId, cityId, cityName) {
    return smartRecommendationsApi.enableTravelMode(userId, cityId)
      .then(() => {
        travelCityId.value = cityId
        travelCityName.value = cityName
        travelModeActive.value = true
        fetchRecommendations(userId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Deactivates travel mode (reverts to current/home city) and refreshes the feed.
   * @param {string|number} userId
   * @returns {Promise<void>}
   */
  function disableTravelMode(userId) {
    return smartRecommendationsApi.disableTravelMode(userId)
      .then(() => {
        travelModeActive.value = false
        travelCityId.value = null
        travelCityName.value = ''
        fetchRecommendations(userId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Deducts the ingredients of a logged recipe from the user's pantry.
   * @param {ReturnType<import('../domain/model/recipe.entity.js').Recipe>} recipe
   * @param {number} servings
   */
  function deductRecipeFromPantry(recipe, servings) {
    const userId = pantryUserId.value
    if (!userId) return

    const ops = recipe.ingredients.map(ing => {
      const needed = ing.quantity * servings
      const pantryItem = pantryItems.value.find(p => p.ingredientId === ing.ingredientId)
      if (!pantryItem) return Promise.resolve()

      const remaining = pantryItem.normalizedQuantity() - needed

      if (remaining > 0) {
        const newUnit = pantryItem.normalizedUnit()
        return smartRecommendationsApi.patchPantryItem(userId, pantryItem.id, { quantity: remaining, unit: newUnit })
          .then(response => {
            pantryItems.value = PantryItemAssembler.toEntitiesFromResponse(response)
          })
      }

      return smartRecommendationsApi.deletePantryItem(userId, pantryItem.id)
        .then(() => {
          pantryItems.value = pantryItems.value.filter(p => p.id !== pantryItem.id)
        })
    })

    Promise.all(ops).catch(error => errors.value.push(error))
  }

  // Auto-load weather whenever the active city changes (home ↔ travel ↔ filter).
  watch(activeCityId, id => fetchWeather(id), { immediate: true })

  on(NUTRITION_LOG_ADDED, ({ dailyMacros }) => {
    consumedCaloriesToday.value = dailyMacros.calories ?? 0
    consumedProteinToday.value  = dailyMacros.proteinG ?? 0
  })

  on(WEIGHT_UPDATED, ({ bmiCategory, goalValue }) => {
    macroProfile.value = MacroProfile.fromBmiAndGoal(bmiCategory, goalValue)
  })

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  /**
   * @param {string[]} restrictions
   * @param {string[]} conditions
   */
  function setUserRestrictions(restrictions, conditions) {
    userRestrictions.value = restrictions ?? []
    userMedicalConditions.value = conditions ?? []
  }

  return {
    recommendations,
    recipes,
    pantryItems,
    cities,
    ingredientCatalog,
    weatherByCity,
    travelModeActive,
    homeCityId,
    homeCityName,
    travelCityId,
    travelCityName,
    currentCityId,
    currentCityName,
    userGoal,
    activeFilters,
    recommendationsLoaded,
    pantryLoaded,
    macroProfile,
    profileFilterActive,
    errors,
    userForbiddenTags,
    activeCityId,
    activeCityName,
    activeCity,
    currentWeather,
    homeCity,
    filteredRecommendations,
    feedRecipes,
    pantryIngredientIds,
    suggestedRecipes,
    partialMatchRecipes,
    consumedCaloriesToday,
    consumedProteinToday,
    onConsumptionUpdated,
    fetchRecommendations,
    fetchRecipes,
    fetchPantry,
    addToPantry,
    removeFromPantry,
    updatePantryQuantity,
    deductRecipeFromPantry,
    fetchCities,
    fetchWeather,
    searchCities,
    importCity,
    detectLocation,
    fetchIngredientCatalog,
    setFilters,
    clearFilters,
    setUserGoal,
    setMacroProfile,
    toggleProfileFilter,
    setHomeCity,
    enableTravelMode,
    disableTravelMode,
    clearErrors,
    setUserRestrictions,
  }
})
