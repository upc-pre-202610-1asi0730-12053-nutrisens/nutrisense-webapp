<!-- PATH: src/app/smart-recommendations/presentation/views/recommendations.view.vue -->
<script setup>
import { ref, computed, watch, onMounted, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useSmartRecommendationsStore } from '../../application/smart-recommendations.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import { useNutritionTrackingStore } from '../../../nutrition-tracking/application/nutrition-tracking.store.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'
import RecommendationCard from '../components/recommendation-card.component.vue'
import RecipeCard from '../components/recipe-card.component.vue'
import PantryList from '../components/pantry-list.component.vue'
import FeatureGate from '../../../subscriptions-billing/presentation/components/feature-gate.component.vue'
import LogDishDialog from '../components/log-dish-dialog.component.vue'
import RecipeDetailDialog from '../components/recipe-detail-dialog.component.vue'

const { t } = useI18n()
const toast = useToast()
const store = useSmartRecommendationsStore()
const iamStore = useIamStore()
const billingStore = useSubscriptionsBillingStore()
const nutritionStore = useNutritionTrackingStore()
const bodyStore = useBodyHealthMetricsStore()

const {
  filteredRecommendations,
  feedRecipes,
  pantryItems,
  ingredientCatalog,
  cities,
  activeCity,
  homeCity,
  activeCityName,
  travelModeActive,
  recommendationsLoaded,
  pantryLoaded,
  macroProfile,
  profileFilterActive,
  errors,
  activeFilters,
  pantryIngredientIds,
  userGoal,
} = toRefs(store)

const { dailyCaloriesConsumed, isViewingToday } = toRefs(nutritionStore)

const calorieGoal = computed(() => bodyStore.userGoal?.dailyCalorieTarget ?? 1911)

/**
 * Projected daily calorie % after adding a given number of calories.
 * @param {number} calories
 * @returns {number}
 */
function recProjectedPct(calories) {
  return Math.round((dailyCaloriesConsumed.value + calories) / calorieGoal.value * 100)
}

/**
 * @param {number} calories
 * @returns {'80'|'110'|'130'|null}
 */
function recBannerLevel(calories) {
  if (!isViewingToday.value) return null
  const pct = recProjectedPct(calories)
  if (pct >= 130) return '130'
  if (pct >= 110) return '110'
  if (pct >= 80)  return '80'
  return null
}

const userId = localStorage.getItem('ns_user_id') ?? ''

const activeTab = ref('feed')
const recTabs = [
  { value: 'feed',   label: t('recommendations.feedTab'),   icon: 'pi-th-large'     },
  { value: 'pantry', label: t('recommendations.pantryTab'), icon: 'pi-shopping-bag' },
]

const showLocationModal = ref(false)
const locationPermitted = ref(false)
const showManualInput = ref(false)
const showTravelDialog = ref(false)
const selectedTravelCityId = ref(null)
const citySearch = ref('')

/**
 * Cities filtered by the current search query (name or country code).
 * @type {import('vue').ComputedRef<ReturnType<import('../../domain/model/city.entity.js').City>[]>}
 */
const filteredCities = computed(() => {
  const q = citySearch.value.toLowerCase().trim()
  if (!q) return cities.value
  return cities.value.filter(c =>
    t(c.key).toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  )
})

/**
 * @param {string} countryCode - ISO 3166-1 alpha-2
 * @returns {string} flag emoji
 */
function countryFlag(countryCode) {
  return [...countryCode.toUpperCase()]
    .map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65))
    .join('')
}

/**
 * @param {import('../../domain/model/weather-type.record.js').WeatherTypeValue} wt
 * @returns {{ icon: string, color: string }}
 */
function weatherStyle(wt) {
  if (wt === 'hot')  return { icon: 'pi-sun',   color: '#f97316' }
  if (wt === 'warm') return { icon: 'pi-sun',   color: '#f59e0b' }
  if (wt === 'cold') return { icon: 'pi-cloud', color: '#3b82f6' }
  return { icon: 'pi-cloud', color: '#9ca3af' }
}

/** @type {import('vue').Ref<ReturnType<import('../../domain/model/recommendation-card.entity.js').RecommendationCard>|null>} */
const logDishTarget = ref(null)
const showLogDishDialog = ref(false)

/** @type {import('vue').Ref<ReturnType<import('../../domain/model/recipe.entity.js').Recipe>|null>} */
const recipeDetailTarget = ref(null)
const showRecipeDetailDialog = ref(false)

/**
 * Food entity from the nutrition catalog matching the active log-dish recommendation.
 * @type {import('vue').ComputedRef<ReturnType<import('../../../nutrition-tracking/domain/model/food.entity.js').Food>|null>}
 */
const logDishFood = computed(() => {
  if (!logDishTarget.value?.foodId) return null
  const targetKey = `food.${logDishTarget.value.foodId}`
  return nutritionStore.foods.find(f => f.key === targetKey) ?? null
})

/**
 * Opens the log-dish dialog for a recommendation card.
 * @param {ReturnType<import('../../domain/model/recommendation-card.entity.js').RecommendationCard>} recommendation
 */
function handleLogDish(recommendation) {
  logDishTarget.value = recommendation
  showLogDishDialog.value = true
}

/**
 * Opens the recipe detail dialog for a recipe card.
 * @param {ReturnType<import('../../domain/model/recipe.entity.js').Recipe>} recipe
 */
function handleRecipeDetail(recipe) {
  recipeDetailTarget.value = recipe
  showRecipeDetailDialog.value = true
}

/**
 * Called when the user confirms logging a recommendation dish.
 * @param {{ foodId: string|null, grams: number, mealType: string, estimatedMacros: {calories:number, proteinG:number, carbsG:number, fatG:number} }} payload
 */
function handleLogDishConfirm({ foodId, grams, mealType, estimatedMacros }) {
  if (logDishFood.value) {
    nutritionStore.addToLog(userId, logDishFood.value.id, grams, mealType, 'manual')
  } else {
    nutritionStore.addEstimatedToLog(
      userId,
      foodId,
      logDishTarget.value?.customFoodName ?? foodId ?? '',
      estimatedMacros,
      mealType,
      'manual',
    )
  }
  toast.add({
    severity: 'success',
    summary: t('nutrition.addedToMeal', { meal: t('meal.' + mealType) }),
    life: 2500,
  })
}

/**
 * Called when the user confirms logging a recipe.
 * @param {{ recipe: ReturnType<import('../../domain/model/recipe.entity.js').Recipe>, servings: number, mealType: string }} payload
 */
function handleLogRecipeConfirm({ recipe, servings, mealType }) {
  nutritionStore.addRecipeToLog(userId, recipe, servings, mealType)
  store.deductRecipeFromPantry(recipe, servings)
  toast.add({
    severity: 'success',
    summary: t('nutrition.addedToMeal', { meal: t('meal.' + mealType) }),
    life: 2500,
  })
}

const showPantryForm = ref(false)
const selectedIngredient = ref(null)
const pantryQuantity = ref(1)
const ingredientSearch = ref('')

/**
 * Ingredients filtered by search query against the translated name.
 * @type {import('vue').ComputedRef<ReturnType<import('../../domain/model/ingredient-catalog-item.entity.js').IngredientCatalogItem>[]>}
 */
const filteredIngredients = computed(() => {
  const q = ingredientSearch.value.toLowerCase().trim()
  if (!q) return ingredientCatalog.value
  return ingredientCatalog.value.filter(i => t(i.key).toLowerCase().includes(q))
})

/**
 * Full entity of the currently selected ingredient, or null.
 * @type {import('vue').ComputedRef<ReturnType<import('../../domain/model/ingredient-catalog-item.entity.js').IngredientCatalogItem>|null>}
 */
const selectedIngredientEntity = computed(() =>
  ingredientCatalog.value.find(i => i.id === selectedIngredient.value) ?? null
)

/**
 * Unit derived automatically from the selected ingredient's domain definition.
 * @type {import('vue').ComputedRef<'g'|'ml'|'unit'>}
 */
const autoUnit = computed(() => selectedIngredientEntity.value?.defaultUnit ?? 'g')


const hasProAccess = computed(() => billingStore.hasAccess('weather-recommendations'))

/** True when the user is on the Basic plan (no access to Recommendations). */
const hasRecommendationsAccess = computed(() =>
  billingStore.currentTier?.isAtLeast('pro') ?? false
)

/** @type {import('vue').ComputedRef<string>} */
const goalLabel = computed(() => {
  if (!userGoal.value) return ''
  const key = userGoal.value === 'weight-loss' ? 'goal.weight_loss' : 'goal.muscle_gain'
  return t('recommendations.goalFor', { goal: t(key) })
})

/** @type {import('vue').ComputedRef<string|null>} */
const travelLabel = computed(() => {
  if (!travelModeActive.value) return null
  return activeCityName.value
    ? t('recommendations.travelActive', { city: activeCityName.value })
    : t('recommendations.travelMode')
})

/** @type {import('vue').ComputedRef<boolean>} */
const hasActiveFilters = computed(() =>
  activeFilters.value.maxKcal !== null
  || activeFilters.value.highInMacro !== null
  || activeFilters.value.sources.length > 0
  || activeFilters.value.citySource !== 'current'
)

const highInOptions = ['protein', 'carbs', 'fat']

/**
 * Unified feed combining recommendation cards (Pro-gated) and recipe cards,
 * each tagged with a discriminator and an isUnsafe flag for restriction-aware rendering.
 * Unsafe items (conflicting with the user's dietary profile) are sorted to the end.
 * @type {import('vue').ComputedRef<Array<{type:'recommendation'|'recipe',item:object,isUnsafe:boolean}>>}
 */
const unifiedFeed = computed(() => {
  const forbidden = store.userForbiddenTags
  const recs = hasProAccess.value
    ? filteredRecommendations.value.map(item => ({
        type: 'recommendation',
        item,
        isUnsafe: item.conflictsWith(forbidden),
      }))
    : []
  const recipes = feedRecipes.value.map(item => ({
    type: 'recipe',
    item,
    isUnsafe: item.conflictsWith(forbidden),
  }))
  const all = [...recs, ...recipes]
  return [...all.filter(e => !e.isUnsafe), ...all.filter(e => e.isUnsafe)]
})

watch(
  [() => iamStore.currentUser, () => bodyStore.latestWeightKg],
  ([user, weightKg]) => {
    if (!user) return
    if (user.goal?.value) store.setUserGoal(user.goal.value)
    if (user.homeCityId) store.setHomeCity(user.homeCityId, user.homeCityId)
    const bmi = weightKg && user.heightCm
      ? bodyStore.getBmi(weightKg, user.heightCm)
      : null
    store.setMacroProfile(bmi?.category ?? null, user.goal?.value ?? null)
    store.setUserRestrictions(
      user.dietaryRestrictions ?? [],
      user.medicalConditions ?? [],
    )
  },
  { immediate: true },
)

onMounted(() => {
  if (userId) {
    store.fetchRecommendations()
    store.fetchRecipes()
    store.fetchPantry(userId)
    store.fetchCities()
    store.fetchIngredientCatalog()
    billingStore.fetchSubscription(userId)
    billingStore.fetchPlans()
    iamStore.fetchCurrentUser(userId)
    nutritionStore.fetchFoods()
    nutritionStore.fetchLogs(userId)
    bodyStore.fetchWeightLogs(userId)
    bodyStore.fetchUserGoal(userId)
  }

  const alreadyAsked = localStorage.getItem('ns_location_asked')
  if (!alreadyAsked) {
    showLocationModal.value = true
  } else {
    locationPermitted.value = localStorage.getItem('ns_location_granted') === 'true'
  }
})

function handleAllowLocation() {
  navigator.geolocation?.getCurrentPosition(
    () => {
      locationPermitted.value = true
      localStorage.setItem('ns_location_granted', 'true')
    },
    () => { showManualInput.value = true },
  )
  localStorage.setItem('ns_location_asked', 'true')
  showLocationModal.value = false
}

function handleManualLocation() {
  localStorage.setItem('ns_location_asked', 'true')
  showLocationModal.value = false
  showManualInput.value = true
}

watch(showTravelDialog, open => {
  if (!open) return
  citySearch.value = ''
  selectedTravelCityId.value = null
})

watch(showManualInput, open => {
  if (!open) return
  citySearch.value = ''
  selectedTravelCityId.value = null
})

watch(showPantryForm, open => {
  if (!open) return
  ingredientSearch.value = ''
  selectedIngredient.value = null
  pantryQuantity.value = 1
})

function handleEnableTravel() {
  if (!selectedTravelCityId.value) return
  const city = cities.value.find(c => c.id === selectedTravelCityId.value)
  if (city) store.enableTravelMode(city.id, t(city.key))
  showTravelDialog.value = false
}

function handleDisableTravel() {
  store.disableTravelMode()
}

/**
 * Handles a quantity update emitted from the pantry list.
 * @param {{ id: string, quantity: number }} payload
 */
function handleUpdateQuantity({ id, quantity }) {
  store.updatePantryQuantity(id, quantity)
  toast.add({
    severity: 'success',
    summary: t('recommendations.quantityUpdated'),
    life: 2000,
  })
}

function handleAddToPantry() {
  if (!selectedIngredientEntity.value) return
  const ing = selectedIngredientEntity.value
  store.addToPantry(userId, ing.id, t(ing.key), pantryQuantity.value, ing.defaultUnit)
  showPantryForm.value = false
}

function handleMaxKcalChange(val) {
  store.setFilters({ maxKcal: val || null })
}

/**
 * Toggles a source filter chip. Empty array means "all".
 * @param {'recommendations'|'recipes'} source
 */
function handleSourceToggle(source) {
  const current = activeFilters.value.sources
  const next = current.includes(source)
    ? current.filter(s => s !== source)
    : [...current, source]
  store.setFilters({ sources: next })
}

/**
 * Selects a high-in-macro filter; deselects if already active.
 * @param {'protein'|'carbs'|'fat'} macro
 */
function handleHighInToggle(macro) {
  const current = activeFilters.value.highInMacro
  store.setFilters({ highInMacro: current === macro ? null : macro })
}
</script>

<template>
  <div class="rec-view">

    <!-- Header -->
    <div class="rec-view__header">
      <div>
        <h1 class="rec-view__title">{{ t('recommendations.title') }}</h1>
        <p class="rec-view__subtitle">{{ t('recommendations.subtitle') }}</p>
      </div>
      <div class="rec-view__header-actions">
        <button
          v-if="travelModeActive"
          class="travel-chip travel-chip--active"
          :aria-label="t('recommendations.changeCity')"
          @click="showTravelDialog = true"
        >
          <i class="pi pi-map-marker" aria-hidden="true" />
          <span>{{ travelLabel }}</span>
          <i class="pi pi-chevron-down" aria-hidden="true" style="font-size:0.625rem;opacity:0.7" />
        </button>
        <button
          v-else
          class="travel-chip"
          :aria-label="t('recommendations.enableTravel')"
          @click="showTravelDialog = true"
        >
          <i class="pi pi-map-marker" aria-hidden="true" />
          <span>{{ locationPermitted ? t('recommendations.locationGranted') : t('recommendations.enableTravel') }}</span>
        </button>
      </div>
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <feature-gate feature="recommendations" :has-access="hasRecommendationsAccess" required-plan="pro">

    <!-- Tab bar -->
    <ns-tabs v-model="activeTab" :tabs="recTabs" />

    <!-- ── FEED TAB ── -->
    <div v-show="activeTab === 'feed'" class="feed-layout">

      <!-- Main content -->
      <div class="feed-main">

        <!-- City context bar -->
        <div v-if="activeCity" class="city-bar" role="note">
          <i class="pi pi-map-marker" aria-hidden="true" />
          <span>{{ t(activeCity.key) }} — {{ activeCity.currentTempC }}°C</span>
          <span v-if="travelModeActive" class="ns-tag ns-tag--pro" style="font-size:0.65rem">{{ t('recommendations.travelMode') }}</span>
        </div>

        <!-- Goal indicator -->
        <div v-if="goalLabel" class="goal-bar" role="note" :aria-label="goalLabel">
          <i class="pi pi-bullseye" aria-hidden="true" />
          <span>{{ goalLabel }}</span>
        </div>

        <!-- Pro upgrade banner -->
        <div v-if="!hasProAccess" class="rec-upgrade-banner">
          <div class="rec-upgrade-banner__icon">
            <i class="pi pi-star" aria-hidden="true" />
          </div>
          <div class="rec-upgrade-banner__body">
            <strong>{{ t('recommendations.proRequired') }}</strong>
            <p>{{ t('recommendations.proBody') }}</p>
          </div>
          <pv-button
            :label="t('subscription.upgradeNow', { plan: 'Pro' })"
            size="small"
            style="flex-shrink:0"
          />
        </div>

        <!-- Unified recommendations section -->
        <section class="rec-section">
          <div class="rec-section__header">
            <h2 class="rec-section__title">{{ t('recommendations.feedSection') }}</h2>
          </div>

          <div v-if="!recommendationsLoaded" class="rec-grid">
            <pv-skeleton v-for="i in 6" :key="i" height="140px" border-radius="12px" />
          </div>
          <div v-else-if="!unifiedFeed.length" class="rec-empty">
            <i class="pi pi-inbox" aria-hidden="true" />
            <span>{{ t('recommendations.noRecommendations') }}</span>
          </div>
          <div v-else class="rec-grid">
            <template v-for="entry in unifiedFeed" :key="entry.item.id">
              <recommendation-card
                v-if="entry.type === 'recommendation'"
                :recommendation="entry.item"
                :projected-pct="recProjectedPct(entry.item.estimatedCalories)"
                :banner-level="recBannerLevel(entry.item.estimatedCalories)"
                :is-unsafe="entry.isUnsafe"
                @log="handleLogDish"
              />
              <recipe-card
                v-else
                :recipe="entry.item"
                :pantry-ingredient-ids="pantryIngredientIds"
                :projected-pct="recProjectedPct(entry.item.totalMacros.calories)"
                :banner-level="recBannerLevel(entry.item.totalMacros.calories)"
                :is-unsafe="entry.isUnsafe"
                @detail="handleRecipeDetail"
              />
            </template>
          </div>
        </section>

      </div>

      <!-- Filter sidebar -->
      <aside class="filter-sidebar" role="complementary" :aria-label="t('common.filter')">

        <!-- Body profile filter -->
        <template v-if="macroProfile">
          <div class="filter-sidebar__section filter-sidebar__section--profile">
            <span class="filter-sidebar__label">{{ t('recommendations.filterProfile') }}</span>
            <div
              v-if="profileFilterActive"
              class="profile-chip profile-chip--active"
              role="note"
            >
              <i class="pi pi-sliders-h" aria-hidden="true" />
              <span>{{ t(macroProfile.labelKey) }}</span>
              <button
                class="profile-chip__close"
                :aria-label="t('recommendations.disableProfile')"
                @click="store.toggleProfileFilter()"
              >
                <i class="pi pi-times" aria-hidden="true" />
              </button>
            </div>
            <button
              v-else
              class="profile-chip profile-chip--inactive"
              :aria-label="t('recommendations.enableProfile')"
              @click="store.toggleProfileFilter()"
            >
              <i class="pi pi-sliders-h" aria-hidden="true" />
              <span>{{ t('recommendations.applyProfile') }}</span>
              <i class="pi pi-plus" aria-hidden="true" style="margin-left:auto" />
            </button>
          </div>
          <div class="filter-sidebar__divider" aria-hidden="true" />
        </template>

        <!-- Location filter -->
        <div class="filter-sidebar__section">
          <span class="filter-sidebar__label">{{ t('recommendations.filterLocation') }}</span>
          <div class="filter-sidebar__chips">
            <button
              class="filter-chip filter-chip--location"
              :class="{ 'filter-chip--active': activeFilters.citySource === 'current' }"
              :aria-pressed="activeFilters.citySource === 'current'"
              @click="store.setFilters({ citySource: 'current' })"
            >
              <i class="pi pi-map-marker" aria-hidden="true" />
              {{ t('recommendations.locationCurrent') }}
            </button>
            <button
              class="filter-chip filter-chip--location"
              :class="{ 'filter-chip--active': activeFilters.citySource === 'home' }"
              :aria-pressed="activeFilters.citySource === 'home'"
              @click="store.setFilters({ citySource: 'home' })"
            >
              <i class="pi pi-home" aria-hidden="true" />
              <span>
                {{ t('recommendations.locationHome') }}
                <span v-if="homeCity" class="filter-chip__meta">
                  {{ t(homeCity.key) }} · {{ homeCity.currentTempC }}°C
                </span>
              </span>
            </button>
          </div>
        </div>

        <div class="filter-sidebar__divider" aria-hidden="true" />

        <div class="filter-sidebar__section">
          <span class="filter-sidebar__label">{{ t('recommendations.filterSource') }}</span>
          <div class="filter-sidebar__chips">
            <button
              class="filter-chip"
              :class="{ 'filter-chip--active': !activeFilters.sources.length }"
              :aria-pressed="!activeFilters.sources.length"
              @click="store.setFilters({ sources: [] })"
            >
              {{ t('recommendations.sourceAll') }}
            </button>
            <button
              class="filter-chip"
              :class="{ 'filter-chip--active': activeFilters.sources.includes('recommendations') }"
              :aria-pressed="activeFilters.sources.includes('recommendations')"
              @click="handleSourceToggle('recommendations')"
            >
              {{ t('recommendations.sourceRecs') }}
            </button>
            <button
              class="filter-chip"
              :class="{ 'filter-chip--active': activeFilters.sources.includes('recipes') }"
              :aria-pressed="activeFilters.sources.includes('recipes')"
              @click="handleSourceToggle('recipes')"
            >
              {{ t('recommendations.sourceRecipes') }}
            </button>
          </div>
        </div>

        <div class="filter-sidebar__divider" aria-hidden="true" />

        <div class="filter-sidebar__section">
          <span class="filter-sidebar__label">{{ t('recommendations.filterHighIn') }}</span>
          <div class="filter-sidebar__chips">
            <button
              class="filter-chip"
              :class="{ 'filter-chip--active': activeFilters.highInMacro === null }"
              :aria-pressed="activeFilters.highInMacro === null"
              @click="store.setFilters({ highInMacro: null })"
            >
              {{ t('recommendations.highInNone') }}
            </button>
            <button
              v-for="macro in highInOptions"
              :key="macro"
              class="filter-chip"
              :class="{ 'filter-chip--active': activeFilters.highInMacro === macro }"
              :aria-pressed="activeFilters.highInMacro === macro"
              @click="handleHighInToggle(macro)"
            >
              {{ t(`macros.${macro}`) }}
            </button>
          </div>
        </div>

        <div class="filter-sidebar__divider" aria-hidden="true" />

        <div class="filter-sidebar__section">
          <label class="filter-sidebar__label" for="sidebar-kcal">
            {{ t('recommendations.filterCalories') }}
          </label>
          <pv-input-number
            id="sidebar-kcal"
            :model-value="activeFilters.maxKcal"
            :min="100"
            :max="5000"
            :placeholder="t('macros.kcal')"
            :aria-label="t('recommendations.filterCalories')"
            class="w-full"
            size="small"
            @update:model-value="handleMaxKcalChange"
          />
        </div>

        <button
          v-if="hasActiveFilters"
          class="filter-clear-btn"
          :aria-label="t('recommendations.clearFilters')"
          @click="store.clearFilters()"
        >
          <i class="pi pi-times" aria-hidden="true" />
          {{ t('recommendations.clearFilters') }}
        </button>

      </aside>

    </div>

    <!-- ── PANTRY TAB ── -->
    <div v-show="activeTab === 'pantry'" class="pantry-tab">
      <div class="rec-section__header" style="margin-bottom:1rem">
        <h2 class="rec-section__title">{{ t('recommendations.pantry') }}</h2>
        <pv-button
          icon="pi pi-plus"
          :label="t('recommendations.addIngredient')"
          size="small"
          outlined
          :aria-label="t('recommendations.addIngredient')"
          @click="showPantryForm = true"
        />
      </div>
      <pantry-list
        :pantry-items="pantryItems"
        :ingredient-catalog="ingredientCatalog"
        :loading="!pantryLoaded"
        @remove="store.removeFromPantry($event)"
        @update-quantity="handleUpdateQuantity"
      />
    </div>

    </feature-gate>

    <!-- Location permission modal -->
    <pv-dialog
      :visible="showLocationModal"
      :header="t('recommendations.locationTitle')"
      :modal="true"
      :draggable="false"
      :closable="false"
      style="width:380px;max-width:95vw"
      @update:visible="() => {}"
    >
      <div class="location-modal">
        <div class="location-modal__icon" aria-hidden="true">
          <i class="pi pi-map-marker" />
        </div>
        <p class="location-modal__body">{{ t('recommendations.locationBody') }}</p>
      </div>
      <template #footer>
        <pv-button :label="t('recommendations.enterManually')" text @click="handleManualLocation" />
        <pv-button :label="t('recommendations.allowLocation')" icon="pi pi-map-marker" @click="handleAllowLocation" />
      </template>
    </pv-dialog>

    <!-- Manual city input -->
    <pv-dialog
      :visible="showManualInput"
      :header="t('recommendations.manualCity')"
      :modal="true"
      :draggable="false"
      style="width:520px;max-width:95vw"
      @update:visible="val => !val && (showManualInput = false)"
    >
      <div class="city-picker">
        <div class="city-picker__search">
          <i class="pi pi-search city-picker__search-icon" aria-hidden="true" />
          <input
            v-model="citySearch"
            type="text"
            class="city-picker__input"
            :placeholder="t('recommendations.searchCity')"
            :aria-label="t('recommendations.searchCity')"
            autofocus
          />
        </div>
        <ul class="city-picker__list" role="listbox" :aria-label="t('recommendations.selectCity')">
          <li
            v-for="city in filteredCities"
            :key="city.id"
            class="city-picker__item"
            :class="{ 'city-picker__item--selected': selectedTravelCityId === city.id }"
            role="option"
            :aria-selected="selectedTravelCityId === city.id"
            tabindex="0"
            @click="selectedTravelCityId = city.id"
            @keydown.enter="selectedTravelCityId = city.id"
          >
            <span class="city-picker__flag" aria-hidden="true">{{ countryFlag(city.country) }}</span>
            <div class="city-picker__info">
              <span class="city-picker__name">{{ t(city.key) }}</span>
              <span class="city-picker__country">{{ city.country }}</span>
            </div>
            <div class="city-picker__weather">
              <i
                class="pi"
                :class="weatherStyle(city.weatherType.value).icon"
                :style="{ color: weatherStyle(city.weatherType.value).color }"
                aria-hidden="true"
              />
              <span class="city-picker__temp">{{ city.currentTempC }}°C</span>
            </div>
          </li>
          <li v-if="!filteredCities.length" class="city-picker__empty">
            <i class="pi pi-search" aria-hidden="true" />
            {{ t('recommendations.noCity') }}
          </li>
        </ul>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" text @click="showManualInput = false" />
        <pv-button
          :label="t('common.confirm')"
          :disabled="!selectedTravelCityId"
          @click="() => { handleEnableTravel(); showManualInput = false }"
        />
      </template>
    </pv-dialog>

    <!-- Travel city selector dialog -->
    <pv-dialog
      :visible="showTravelDialog"
      :header="t('recommendations.selectCity')"
      :modal="true"
      :draggable="false"
      style="width:520px;max-width:95vw"
      @update:visible="val => !val && (showTravelDialog = false)"
    >
      <div class="city-picker">
        <div class="city-picker__search">
          <i class="pi pi-search city-picker__search-icon" aria-hidden="true" />
          <input
            v-model="citySearch"
            type="text"
            class="city-picker__input"
            :placeholder="t('recommendations.searchCity')"
            :aria-label="t('recommendations.searchCity')"
            autofocus
          />
        </div>
        <ul class="city-picker__list" role="listbox" :aria-label="t('recommendations.selectCity')">
          <li
            v-for="city in filteredCities"
            :key="city.id"
            class="city-picker__item"
            :class="{ 'city-picker__item--selected': selectedTravelCityId === city.id }"
            role="option"
            :aria-selected="selectedTravelCityId === city.id"
            tabindex="0"
            @click="selectedTravelCityId = city.id"
            @keydown.enter="selectedTravelCityId = city.id"
          >
            <span class="city-picker__flag" aria-hidden="true">{{ countryFlag(city.country) }}</span>
            <div class="city-picker__info">
              <span class="city-picker__name">{{ t(city.key) }}</span>
              <span class="city-picker__country">{{ city.country }}</span>
            </div>
            <div class="city-picker__weather">
              <i
                class="pi"
                :class="weatherStyle(city.weatherType.value).icon"
                :style="{ color: weatherStyle(city.weatherType.value).color }"
                aria-hidden="true"
              />
              <span class="city-picker__temp">{{ city.currentTempC }}°C</span>
            </div>
          </li>
          <li v-if="!filteredCities.length" class="city-picker__empty">
            <i class="pi pi-search" aria-hidden="true" />
            {{ t('recommendations.noCity') }}
          </li>
        </ul>
        <pv-button
          v-if="travelModeActive"
          :label="t('recommendations.disableTravel')"
          severity="secondary"
          outlined
          size="small"
          icon="pi pi-home"
          style="margin-top:0.75rem;width:100%"
          @click="() => { handleDisableTravel(); showTravelDialog = false }"
        />
      </div>
      <template #footer>
        <pv-button :label="t('recommendations.cancel')" text @click="showTravelDialog = false" />
        <pv-button
          :label="t('recommendations.enableTravel')"
          :disabled="!selectedTravelCityId"
          @click="handleEnableTravel"
        />
      </template>
    </pv-dialog>

    <!-- Log dish dialog -->
    <log-dish-dialog
      :visible="showLogDishDialog"
      :recommendation="logDishTarget"
      :food="logDishFood"
      @update:visible="showLogDishDialog = $event"
      @confirm="handleLogDishConfirm"
    />

    <!-- Recipe detail + log dialog -->
    <recipe-detail-dialog
      :visible="showRecipeDetailDialog"
      :recipe="recipeDetailTarget"
      :pantry-ingredient-ids="pantryIngredientIds"
      :ingredient-catalog="ingredientCatalog"
      @update:visible="showRecipeDetailDialog = $event"
      @log="handleLogRecipeConfirm"
    />

    <!-- Add to pantry dialog -->
    <pv-dialog
      :visible="showPantryForm"
      :header="t('recommendations.addIngredient')"
      :modal="true"
      :draggable="false"
      style="width:500px;max-width:95vw"
      @update:visible="val => !val && (showPantryForm = false)"
    >
      <div class="ing-picker">

        <!-- Search -->
        <div class="city-picker__search">
          <i class="pi pi-search city-picker__search-icon" aria-hidden="true" />
          <input
            v-model="ingredientSearch"
            type="text"
            class="city-picker__input"
            :placeholder="t('recommendations.searchIngredient')"
            :aria-label="t('recommendations.searchIngredient')"
            autofocus
          />
        </div>

        <!-- Ingredient list -->
        <ul class="city-picker__list" role="listbox" :aria-label="t('recommendations.ingredient')">
          <li
            v-for="ing in filteredIngredients"
            :key="ing.id"
            class="ing-picker__item"
            :class="{ 'ing-picker__item--selected': selectedIngredient === ing.id }"
            role="option"
            :aria-selected="selectedIngredient === ing.id"
            tabindex="0"
            @click="selectedIngredient = ing.id"
            @keydown.enter="selectedIngredient = ing.id"
          >
            <span class="ing-picker__cat">{{ t('ingredient.category.' + ing.category.value) }}</span>
            <span class="ing-picker__name">{{ t(ing.key) }}</span>
            <span class="ing-picker__unit-badge">{{ ing.defaultUnit }}</span>
            <i
              v-if="selectedIngredient === ing.id"
              class="pi pi-check ing-picker__check"
              aria-hidden="true"
            />
          </li>
          <li v-if="!filteredIngredients.length" class="city-picker__empty">
            <i class="pi pi-search" aria-hidden="true" />
            {{ t('recommendations.noIngredient') }}
          </li>
        </ul>

        <!-- Quantity (only when ingredient is selected) -->
        <transition name="ing-fade">
          <div v-if="selectedIngredientEntity" class="ing-picker__qty-row">
            <div class="ing-picker__qty-label">
              <span class="ing-picker__selected-name">{{ t(selectedIngredientEntity.key) }}</span>
              <span class="ing-picker__qty-hint">{{ t('recommendations.quantity') }}</span>
            </div>
            <div class="ing-picker__qty-input-wrap">
              <pv-input-number
                v-model="pantryQuantity"
                :min="1"
                :max="9999"
                :aria-label="t('recommendations.quantity')"
                input-class="ing-picker__qty-input"
              />
              <span class="ing-picker__unit-tag">{{ autoUnit }}</span>
            </div>
          </div>
        </transition>

      </div>
      <template #footer>
        <pv-button :label="t('recommendations.cancel')" text @click="showPantryForm = false" />
        <pv-button
          :label="t('recommendations.add')"
          :disabled="!selectedIngredientEntity"
          icon="pi pi-plus"
          @click="handleAddToPantry"
        />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.rec-view { max-width: 100%; }

/* ── Header ─────────────────────────────── */
.rec-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.rec-view__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.125rem;
}

.rec-view__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.rec-view__header-actions { display: flex; align-items: center; gap: 0.625rem; }

/* ── Travel chip ─────────────────────────── */
.travel-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.875rem;
  border-radius: 99px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.travel-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.travel-chip--active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(80,139,137,0.08);
}

/* ── Feed layout: main + sidebar ────────── */
.feed-layout {
  display: grid;
  grid-template-columns: 1fr 236px;
  gap: 1.5rem;
  align-items: start;
  margin-top: 1.25rem;
}

.feed-main { min-width: 0; }

/* ── Context bars ───────────────────────── */
.city-bar,
.goal-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  border-radius: 10px;
  padding: 0.5rem 0.875rem;
  margin-bottom: 0.625rem;
}

.city-bar {
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.goal-bar {
  color: var(--p-primary-700, #047857);
  background: var(--p-primary-50, #f0fdf4);
  border: 1px solid var(--p-primary-200, #a7f3d0);
  font-weight: 500;
}

/* ── Profile chip (in sidebar) ──────────── */
.filter-sidebar__section--profile { padding-bottom: 0.875rem; }

.profile-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  border-radius: 8px;
  padding: 0.5rem 0.625rem;
  font-weight: 500;
  width: 100%;
  text-align: left;
  font-family: inherit;
  line-height: 1.35;
}

.profile-chip--active {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  cursor: default;
}

.profile-chip--active .pi-sliders-h { color: #3b82f6; flex-shrink: 0; }

.profile-chip__close {
  background: none;
  border: none;
  cursor: pointer;
  color: #93c5fd;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 0.6875rem;
  margin-left: auto;
  transition: color 0.15s;
  flex-shrink: 0;
}
.profile-chip__close:hover { color: #1d4ed8; }

.profile-chip--inactive {
  background: #f5f3f1;
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.profile-chip--inactive:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

/* ── Upgrade banner ─────────────────────── */
.rec-upgrade-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 14px;
  padding: 1.125rem;
  margin-bottom: 1.25rem;
}

.rec-upgrade-banner__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(59,130,246,0.10);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.rec-upgrade-banner__body { flex: 1; }
.rec-upgrade-banner__body strong { font-size: 0.875rem; color: var(--color-text); display: block; margin-bottom: 0.2rem; }
.rec-upgrade-banner__body p { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }

/* ── Section ────────────────────────────── */
.rec-section { margin-bottom: 1.5rem; }

.rec-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.rec-section__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

/* ── Grid ───────────────────────────────── */
.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.875rem;
}

/* ── Empty state ────────────────────────── */
.rec-empty {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 2rem 1.25rem;
  background: #fafaf9;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.rec-empty i { font-size: 1.5rem; color: var(--color-border); flex-shrink: 0; }

/* ── Filter sidebar ─────────────────────── */
.filter-sidebar {
  position: sticky;
  top: 1rem;
  background: var(--color-surface, #fafaf9);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.filter-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.filter-sidebar__label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.filter-sidebar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.filter-sidebar__divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 -1rem;
}

.filter-chip {
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  letter-spacing: 0.02em;
}

.filter-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.filter-chip--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.filter-chip--location {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  width: 100%;
  text-align: left;
  line-height: 1.35;
}

.filter-chip__meta {
  display: block;
  font-size: 0.6875rem;
  font-weight: 400;
  opacity: 0.8;
  margin-top: 0.1rem;
}

.filter-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0.75rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  width: 100%;
}

.filter-clear-btn:hover {
  color: var(--color-danger, #ef4444);
  border-color: var(--color-danger, #ef4444);
}

/* ── Pantry tab ─────────────────────────── */
.pantry-tab { margin-top: 1.25rem; }

.rec-section__header { margin-bottom: 1rem; }

/* ── Location modal ─────────────────────── */
.location-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
}

.location-modal__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(80,139,137,0.10);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.location-modal__body { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6; }

/* ── Pantry form ────────────────────────── */
.pantry-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.pantry-form__field { display: flex; flex-direction: column; gap: 0.375rem; }
.pantry-form__label { font-size: 0.8125rem; font-weight: 500; color: var(--color-text-secondary); }

.pantry-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* ── Responsive ─────────────────────────── */
@media (max-width: 720px) {
  .feed-layout {
    grid-template-columns: 1fr;
  }

  .filter-sidebar {
    position: static;
    order: -1;
  }

  .rec-upgrade-banner { flex-direction: column; text-align: center; }
}

/* ── City picker ── */
.city-picker { display: flex; flex-direction: column; gap: 0; }

.city-picker__search {
  position: relative;
  margin-bottom: 0.75rem;
}
.city-picker__search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  pointer-events: none;
}
.city-picker__input {
  width: 100%;
  padding: 0.625rem 0.875rem 0.625rem 2.5rem;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-text);
  background: #faf9f7;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.city-picker__input:focus { border-color: var(--color-primary); background: #fff; }
.city-picker__input::placeholder { color: #bbb; }

.city-picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #fff;
}

.city-picker__item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f5f1ee;
  outline: none;
}
.city-picker__item:last-child { border-bottom: none; }
.city-picker__item:hover { background: #faf8f6; }
.city-picker__item:focus-visible { background: #f5f3f1; }
.city-picker__item--selected {
  background: #f0f7f7;
  border-left: 3px solid var(--color-primary);
}
.city-picker__item--selected:hover { background: #e8f4f4; }

.city-picker__flag { font-size: 1.625rem; line-height: 1; flex-shrink: 0; }

.city-picker__info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.city-picker__name { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); }
.city-picker__country {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.city-picker__weather {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
  min-width: 44px;
}
.city-picker__weather .pi { font-size: 1.125rem; }
.city-picker__temp {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.city-picker__empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  padding: 2rem 1rem;
  color: #bbb;
  font-size: 0.875rem;
}

/* ── Ingredient picker ───────────────────── */
.ing-picker { display: flex; flex-direction: column; gap: 0; }

.ing-picker__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f5f1ee;
  outline: none;
}
.ing-picker__item:last-child { border-bottom: none; }
.ing-picker__item:hover { background: #faf8f6; }
.ing-picker__item:focus-visible { background: #f5f3f1; }
.ing-picker__item--selected {
  background: #f0f7f7;
  border-left: 3px solid var(--color-primary);
}
.ing-picker__item--selected:hover { background: #e8f4f4; }

.ing-picker__cat {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 4.5rem;
}

.ing-picker__name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.ing-picker__unit-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  flex-shrink: 0;
}

.ing-picker__check {
  color: var(--color-primary);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.ing-picker__qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.875rem;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.ing-picker__qty-label {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.ing-picker__selected-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ing-picker__qty-hint {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
}

.ing-picker__qty-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.ing-picker__unit-tag {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(80,139,137,0.10);
  border-radius: 6px;
  padding: 0.25rem 0.625rem;
}

/* ing-fade transition */
.ing-fade-enter-active,
.ing-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.ing-fade-enter-from,
.ing-fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
