// PATH: src/app/smart-recommendations/application/smart-recommendations.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SmartRecommendationsApi } from '../infrastructure/smart-recommendations.api.js'
import { RecommendationCardAssembler } from '../infrastructure/recommendation-card.assembler.js'
import { RecipeAssembler } from '../infrastructure/recipe.assembler.js'
import { PantryItemAssembler } from '../infrastructure/pantry-item.assembler.js'
import { CityAssembler } from '../infrastructure/city.assembler.js'
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

/**
 * Store for weather-based food recommendations, recipes, pantry, and city data.
 */
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
  const travelModeActive = ref(false)
  /** @type {import('vue').Ref<string|null>} */
  const homeCityId = ref(null)
  const homeCityName = ref('')
  /** @type {import('vue').Ref<string|null>} */
  const travelCityId = ref(null)
  const travelCityName = ref('')
  /** @type {import('vue').Ref<import('../../../shared/domain/model/goal-type.record.js').GoalTypeValue|null>} */
  const userGoal = ref(null)
  const activeFilters = ref({
    maxKcal: /** @type {number|null} */ (null),
    /** @type {'protein'|'carbs'|'fat'|null} */
    highInMacro: null,
    /** @type {Array<'recommendations'|'recipes'>} */
    sources: [],
    temperatureContext: /** @type {'auto'|'cold'|'hot'} */ ('auto'),
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

  /**
   * Flat set of food tags forbidden by the user's restrictions and medical conditions.
   * Used by recommendation/recipe entities' conflictsWith() method.
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
   * 'home' always resolves to homeCityId; 'current' uses the travel city when travel mode is on.
   * @type {import('vue').ComputedRef<string|null>}
   */
  const activeCityId = computed(() => {
    if (activeFilters.value.citySource === 'home') return homeCityId.value
    return travelModeActive.value ? travelCityId.value : homeCityId.value
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
    return travelModeActive.value ? travelCityName.value : homeCityName.value
  })

  /**
   * Current active city entity, if loaded.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/city.entity.js').City>|null>}
   */
  const activeCity = computed(() =>
    cities.value.find(c => c.id === activeCityId.value) ?? null
  )

  /**
   * Recommendations filtered by goal, source, macro focus and max kcal.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/recommendation-card.entity.js').RecommendationCard>[]>}
   */
  const filteredRecommendations = computed(() => {
    const showRecs = !activeFilters.value.sources.length
      || activeFilters.value.sources.includes('recommendations')
    if (!showRecs) return []

    let result = recommendations.value

    if (activeCityId.value)
      result = result.filter(r => r.matchesCity(activeCityId.value))

    if (userGoal.value)
      result = result.filter(r => r.matchesGoal(userGoal.value))

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
   * @type {import('vue').ComputedRef<string[]>}
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
   * Includes full and partial pantry matches when source filter allows recipes.
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
   * Loads all recommendation cards.
   */
  function fetchRecommendations() {
    smartRecommendationsApi.getRecommendations()
      .then(response => {
        recommendations.value = RecommendationCardAssembler.toEntitiesFromResponse(response)
        recommendationsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads all recipes.
   */
  function fetchRecipes() {
    smartRecommendationsApi.getRecipes()
      .then(response => {
        recipes.value = RecipeAssembler.toEntitiesFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads pantry items for a given user.
   * @param {string} userId
   */
  function fetchPantry(userId) {
    smartRecommendationsApi.getPantryItems()
      .then(response => {
        const all = PantryItemAssembler.toEntitiesFromResponse(response)
        pantryItems.value = all.filter(p => p.userId === userId)
        pantryLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Adds an ingredient to the pantry.
   * @param {string} userId
   * @param {string} ingredientId
   * @param {string} ingredientName
   * @param {number} quantity
   * @param {string} unit
   */
  function addToPantry(userId, ingredientId, ingredientName, quantity, unit) {
    const resource = { userId, ingredientId, ingredientName, quantity, unit, addedAt: new Date().toISOString() }
    smartRecommendationsApi.createPantryItem(resource)
      .then(response => {
        const newItem = PantryItemAssembler.toEntityFromResource(response.data)
        if (newItem) pantryItems.value.push(newItem)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes a pantry item by ID.
   * @param {string} itemId
   */
  function removeFromPantry(itemId) {
    smartRecommendationsApi.deletePantryItem(itemId)
      .then(() => {
        pantryItems.value = pantryItems.value.filter(p => p.id !== itemId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates the quantity of an existing pantry item.
   * @param {string} itemId
   * @param {number} quantity
   */
  function updatePantryQuantity(itemId, quantity) {
    const item = pantryItems.value.find(p => p.id === itemId)
    if (!item) return
    smartRecommendationsApi.patchPantryItem(itemId, { quantity, unit: item.unit })
      .then(response => {
        const updated = PantryItemAssembler.toEntityFromResource(response.data)
        if (updated) {
          pantryItems.value = pantryItems.value.map(p => p.id === itemId ? updated : p)
        }
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
      temperatureContext: 'auto',
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
   * Records today's consumed macros so the recommendation feed can factor in remaining needs.
   * Called by Nutrition Tracking after every log mutation (Consumption Updated policy).
   * @param {{ calories: number, proteinG: number }} consumed
   * @param {number} calorieGoal
   */
  function onConsumptionUpdated(consumed, calorieGoal) {
    consumedCaloriesToday.value = consumed.calories ?? 0
    consumedProteinToday.value = consumed.proteinG ?? 0
  }

  /**
   * Sets the user's home city.
   * @param {string} cityId
   * @param {string} cityName
   */
  function setHomeCity(cityId, cityName) {
    homeCityId.value = cityId
    homeCityName.value = cityName
  }

  /**
   * Activates travel mode with a different city.
   * @param {string} cityId
   * @param {string} cityName
   */
  function enableTravelMode(cityId, cityName) {
    travelCityId.value = cityId
    travelCityName.value = cityName
    travelModeActive.value = true
  }

  /**
   * Deactivates travel mode and reverts to home city.
   */
  function disableTravelMode() {
    travelModeActive.value = false
    travelCityId.value = null
    travelCityName.value = ''
  }

  /**
   * Deducts the ingredients of a logged recipe from the user's pantry.
   * Each ingredient quantity is scaled by the number of servings.
   * Items that reach zero or below are removed; others are patched with the remaining amount.
   * @param {ReturnType<import('../domain/model/recipe.entity.js').Recipe>} recipe
   * @param {number} servings
   */
  function deductRecipeFromPantry(recipe, servings) {
    const ops = recipe.ingredients.map(ing => {
      const needed = ing.quantity * servings
      const pantryItem = pantryItems.value.find(p => p.ingredientId === ing.ingredientId)
      if (!pantryItem) return Promise.resolve()

      const remaining = pantryItem.normalizedQuantity() - needed

      if (remaining > 0) {
        const newUnit = pantryItem.normalizedUnit()
        return smartRecommendationsApi.patchPantryItem(pantryItem.id, { quantity: remaining, unit: newUnit })
          .then(response => {
            const updated = PantryItemAssembler.toEntityFromResource(response.data)
            if (updated) {
              pantryItems.value = pantryItems.value.map(p => p.id === pantryItem.id ? updated : p)
            }
          })
      }

      return smartRecommendationsApi.deletePantryItem(pantryItem.id)
        .then(() => {
          pantryItems.value = pantryItems.value.filter(p => p.id !== pantryItem.id)
        })
    })

    Promise.all(ops).catch(error => errors.value.push(error))
  }

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
   * Stores the user's dietary restrictions and medical conditions for conflict detection.
   * @param {string[]} restrictions - dietary restriction values (e.g. 'gluten-free')
   * @param {string[]} conditions   - medical condition values (e.g. 'coeliac-disease')
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
    travelModeActive,
    homeCityId,
    homeCityName,
    travelCityId,
    travelCityName,
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
