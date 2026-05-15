<!-- PATH: src/app/nutrition-tracking/presentation/views/nutrition-log.view.vue -->
<script setup>
import { ref, computed, onMounted, watch, toRefs } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useNutritionTrackingStore } from '../../application/nutrition-tracking.store.js'
import { conflictingFlags } from '../../domain/services/food-restriction.service.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import { useActivityWearableStore } from '../../../activity-wearable/application/activity-wearable.store.js'

const { t, locale } = useI18n()
const router  = useRouter()
const route   = useRoute()
const toast   = useToast()
const confirm = useConfirm()

const nutritionStore = useNutritionTrackingStore()
const bodyStore      = useBodyHealthMetricsStore()
const iamStore       = useIamStore()
const subStore       = useSubscriptionsBillingStore()
const activityStore  = useActivityWearableStore()

const { logsByMealType, dailyCaloriesConsumed, dailyMacros,
        selectedDate, isViewingToday, logsLoaded, foods,
        scanDishLoading, scanMenuLoading, dishScanResult, menuScanResult } = toRefs(nutritionStore)

const { todayCaloriesBurned } = toRefs(activityStore)

const { currentUser } = toRefs(iamStore)

const userId = localStorage.getItem('ns_user_id') ?? ''

onMounted(() => {
  if (route.query.tab === 'smart-scan') activeTab.value = 'smart-scan'
  if (!userId) return
  nutritionStore.fetchLogs(userId)
  nutritionStore.fetchFoods()
  bodyStore.fetchUserGoal(userId)
  activityStore.fetchActivityLogs(userId)
  if (!currentUser.value) iamStore.fetchCurrentUser(userId)
})

const accountCreatedAt = computed(() => {
  const raw = currentUser.value?.createdAt
  if (!raw) return null
  const d = new Date(raw)
  d.setHours(0, 0, 0, 0)
  return d
})

const isAtMinDate = computed(() => {
  if (!accountCreatedAt.value) return false
  const selected = new Date(selectedDate.value)
  selected.setHours(0, 0, 0, 0)
  return selected <= accountCreatedAt.value
})

/* Tabs */
const activeTab = ref('daily-log')

/* Access */
const canScanDish = computed(() => subStore.hasAccess('smart-scan'))
const canScanMenu = computed(() => subStore.hasAccess('menu-scan'))

const nlTabs = computed(() => [
  { value: 'daily-log',  label: t('nutrition.title'),    icon: 'pi-calendar' },
  { value: 'smart-scan', label: t('nutrition.smartScan'), icon: canScanDish.value ? 'pi-camera' : 'pi-lock', disabled: !canScanDish.value && !canScanMenu.value },
])

const bcp47 = computed(() => locale.value === 'es' ? 'es-ES' : 'en-US')

/* Date label */
const dateLabel = computed(() => {
  const d     = selectedDate.value
  const today = new Date()
  const yest  = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t('nutrition.today')
  if (d.toDateString() === yest.toDateString()) return t('nutrition.yesterday')
  return d.toLocaleDateString(bcp47.value, { weekday: 'short', month: 'short', day: 'numeric' })
})

/* Goal */
const calorieGoal = computed(() => bodyStore.userGoal?.dailyCalorieTarget ?? 1911)
const proteinGoal = computed(() => bodyStore.userGoal?.macroTargets?.proteinG ?? 112)
const carbsGoal   = computed(() => bodyStore.userGoal?.macroTargets?.carbsG   ?? 247)
const fatGoal     = computed(() => bodyStore.userGoal?.macroTargets?.fatG     ?? 53)
const fiberGoal   = computed(() => bodyStore.userGoal?.macroTargets?.fiberG   ?? 25)
const remaining      = computed(() =>
  Math.max(0, calorieGoal.value - dailyCaloriesConsumed.value + todayCaloriesBurned.value)
)
const goalPct        = computed(() => Math.min(100, Math.round(dailyCaloriesConsumed.value / calorieGoal.value * 100)))
const goalPctRaw     = computed(() => Math.round(dailyCaloriesConsumed.value / calorieGoal.value * 100))

/**
 * Returns the highest exceeded threshold for the main daily banner.
 * @returns {'110'|'130'|null}
 */
const calorieBannerLevel = computed(() => {
  if (!isViewingToday.value) return null
  const pct = goalPctRaw.value
  if (pct >= 130) return '130'
  if (pct >= 110) return '110'
  return null
})

watch([calorieGoal, proteinGoal], ([cal, prot]) => nutritionStore.setGoals(cal, prot), { immediate: true })

/** @type {import('vue').ComputedRef<boolean>} */
const streakMet = computed(() =>
  nutritionStore.evaluateStreakMet(calorieGoal.value, proteinGoal.value)
)

/**
 * Returns the i18n key explaining why streak is not met, or null when met.
 * @type {import('vue').ComputedRef<string|null>}
 */
const streakBlockReason = computed(() => {
  if (!isViewingToday.value || !logsLoaded.value || streakMet.value) return null
  const hasMeals = ['breakfast', 'lunch', 'dinner'].every(
    m => (logsByMealType.value[m]?.length ?? 0) > 0
  )
  if (!hasMeals) return 'nutrition.streakMissingMeals'
  const calPct = goalPctRaw.value
  if (calPct < 80) return 'nutrition.streakCaloriesLow'
  if (calPct > 105) return 'nutrition.streakCaloriesOver'
  const effectiveProteinGoal = proteinGoal.value > 0 ? proteinGoal.value : 50
  if ((dailyMacros.value?.proteinG ?? 0) / effectiveProteinGoal * 100 < 50) return 'nutrition.streakProtein'
  return 'nutrition.streakNotMet'
})

/* Entry detail & edit */
/** @type {import('vue').Ref<ReturnType<import('../../domain/model/nutrition-log.entity.js').NutritionLog>|null>} */
const selectedLog     = ref(null)
const showDetailModal = ref(false)
const showEditModal   = ref(false)
const editGrams       = ref(100)

const detailMacros = computed(() => selectedLog.value?.macros() ?? null)

const editFood = computed(() =>
  selectedLog.value ? foods.value.find(f => f.id === selectedLog.value.foodId) ?? null : null
)
const editLiveMacros  = computed(() => editFood.value?.macrosForQuantity(editGrams.value ?? 0) ?? null)
const editLiveKcal    = computed(() => Math.round(editLiveMacros.value?.calories ?? 0))
const editLiveProtein = computed(() => Math.round((editLiveMacros.value?.proteinG ?? 0) * 10) / 10)
const editLiveCarbs   = computed(() => Math.round((editLiveMacros.value?.carbsG   ?? 0) * 10) / 10)
const editLiveFat     = computed(() => Math.round((editLiveMacros.value?.fatG     ?? 0) * 10) / 10)

/** @param {ReturnType<import('../../domain/model/nutrition-log.entity.js').NutritionLog>} log */
function openDetail(log) {
  selectedLog.value     = log
  showDetailModal.value = true
}

/** Opens the edit modal pre-populated with the selected log's current quantity. */
function openEdit() {
  if (!selectedLog.value) return
  editGrams.value       = selectedLog.value.quantityG
  showDetailModal.value = false
  showEditModal.value   = true
}

/** Validates the edited quantity and saves the update, then closes the edit modal. */
function confirmEdit() {
  if (!selectedLog.value || !isViewingToday.value) return
  if (!editGrams.value || editGrams.value < 1) {
    toast.add({ severity: 'warn', summary: t('nutrition.errorQuantityRange'), life: 3000 })
    return
  }
  nutritionStore.updateLogQuantity(selectedLog.value.id, editGrams.value)
  toast.add({ severity: 'success', summary: t('nutrition.quantityUpdated'), life: 2500 })
  showEditModal.value = false
  selectedLog.value   = null
}

/* Search */
const showSearch      = ref(false)
const searchQuery     = ref('')
const searchResults   = ref([])
const pendingMealType = ref('breakfast')

let debounceTimer = null
/** Debounces food search input and filters the foods list against the translated keys. */
function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const raw = searchQuery.value.trim()
    if (!raw) { searchResults.value = []; return }
    const q = raw.toLowerCase()
    searchResults.value = foods.value
      .filter(f => t(f.key).toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
      .slice(0, 10)
  }, 250)
}

watch(showSearch, open => {
  if (open) {
    searchQuery.value   = ''
    searchResults.value = []
  }
})

/**
 * Opens the food search panel with the given meal type pre-selected.
 * @param {string} [meal]
 */
function openSearch(meal = 'breakfast') {
  pendingMealType.value = meal
  showSearch.value      = true
}

/* Add to log */
const showAddModal = ref(false)
const selectedFood = ref(null)
const addGrams     = ref(100)
const addMealType  = ref('breakfast')
const mealOptions = [
  { label: t('meal.breakfast'), value: 'breakfast' },
  { label: t('meal.lunch'),     value: 'lunch'     },
  { label: t('meal.snack'),     value: 'snack'     },
  { label: t('meal.dinner'),    value: 'dinner'    },
]

const baseMacros  = computed(() => selectedFood.value?.macrosForQuantity(100) ?? null)
const liveMacros  = computed(() => selectedFood.value?.macrosForQuantity(addGrams.value ?? 0) ?? null)
const liveKcal    = computed(() => Math.round(liveMacros.value?.calories ?? 0))
const liveProtein = computed(() => Math.round((liveMacros.value?.proteinG ?? 0) * 10) / 10)
const liveCarbs   = computed(() => Math.round((liveMacros.value?.carbsG   ?? 0) * 10) / 10)
const liveFat     = computed(() => Math.round((liveMacros.value?.fatG     ?? 0) * 10) / 10)
const willReachPctRaw = computed(() =>
  Math.round((dailyCaloriesConsumed.value + liveKcal.value) / calorieGoal.value * 100)
)
const willReachPct = computed(() => Math.min(100, willReachPctRaw.value))

/**
 * Returns the warning level when adding a food item in the modal.
 * @returns {'110'|'130'|null}
 */
const addModalBannerLevel = computed(() => {
  const pct = willReachPctRaw.value
  if (pct >= 130) return '130'
  if (pct >= 110) return '110'
  return null
})

const willExceed = computed(() =>
  dailyCaloriesConsumed.value + liveKcal.value > calorieGoal.value
)

const selectedFoodConflicts = computed(() => {
  if (!selectedFood.value) return []
  return conflictingFlags(
    selectedFood.value,
    currentUser.value?.dietaryRestrictions ?? [],
    currentUser.value?.medicalConditions ?? [],
  )
})

/**
 * Selects a food item and opens the add-to-log modal.
 * @param {{ id: string, key: string }} food
 */
function selectFood(food) {
  selectedFood.value = food
  addMealType.value  = pendingMealType.value
  addGrams.value     = 100
  showSearch.value   = false
  showAddModal.value = true
}

/** Adds the selected food to today's log and closes the add modal. */
function confirmAdd() {
  if (!isViewingToday.value) return
  nutritionStore.addToLog(userId, selectedFood.value.id, addGrams.value, addMealType.value, 'manual')
  toast.add({ severity: 'success', summary: t('nutrition.addedToMeal', { meal: t('meal.' + addMealType.value) }), life: 2500 })
  showAddModal.value = false
}

/**
 * Prompts the user to confirm removal, then removes the log entry.
 * @param {string} logId
 */
function removeEntry(logId) {
  confirm.require({
    message: t('nutrition.removeEntryConfirm'),
    header:  t('nutrition.removeEntryHeader'),
    icon: 'pi pi-trash',
    acceptClass: 'p-button-danger',
    accept: () => {
      nutritionStore.removeFromLog(logId)
      toast.add({ severity: 'info', summary: t('nutrition.entryRemoved'), life: 2000 })
    },
  })
}

/* Meal helpers */
const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

const mealMeta = {
  breakfast: { labelKey: 'meal.breakfast', icon: 'pi-sun',   color: '#f59e0b', bg: '#fef3c7', border: '#f59e0b' },
  lunch:     { labelKey: 'meal.lunch',     icon: 'pi-clock', color: '#10b981', bg: '#d1fae5', border: '#10b981' },
  snack:     { labelKey: 'meal.snack',     icon: 'pi-heart', color: '#ec4899', bg: '#fce7f3', border: '#ec4899' },
  dinner:    { labelKey: 'meal.dinner',    icon: 'pi-moon',  color: '#6366f1', bg: '#e0e7ff', border: '#6366f1' },
}

/**
 * Returns the total calories for all logs in a given meal type.
 * @param {string} type
 * @returns {number}
 */
function mealTotal(type) {
  return (logsByMealType.value?.[type] ?? []).reduce((s, l) => {
    try { return s + (l.macros?.().calories ?? 0) } catch { return s }
  }, 0)
}

/**
 * Returns the translated food name from a log entry, falling back to the raw name.
 * @param {{ foodKey?: string, name?: string }} log
 * @returns {string}
 */
function foodName(log) {
  try { return log.foodKey ? t(log.foodKey) : (log.name ?? t('nutrition.unknownFood')) } catch { return log.name ?? t('nutrition.unknownFood') }
}

/**
 * Returns the calorie value from a log entry's macros, defaulting to 0 on error.
 * @param {{ macros?: () => { calories: number } }} log
 * @returns {number}
 */
function logKcal(log) {
  try { return log.macros?.().calories ?? 0 } catch { return 0 }
}

/* Smart Scan */
watch(dishScanResult, result => {
  if (result) router.push({ name: 'scan-dish-result' })
})

watch(menuScanResult, result => {
  if (result) router.push({ name: 'scan-menu-result' })
})

const scanDragOver = ref({ dish: false, menu: false })

/**
 * Handles a drag-and-drop image onto a scan zone.
 * @param {'dish'|'menu'} type
 * @param {DragEvent} e
 */
function handleDrop(type, e) {
  e.preventDefault()
  scanDragOver.value[type] = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processScanFile(type, file)
}

/**
 * Programmatically clicks the hidden file input for the given scan type.
 * @param {'dish'|'menu'} type
 */
function triggerFileInput(type) {
  document.getElementById(`scan-input-${type}`)?.click()
}

/**
 * Called when the user selects a file via the file input.
 * @param {'dish'|'menu'} type
 * @param {Event} e
 */
function onFileChange(type, e) {
  const file = e.target.files?.[0]
  if (file) processScanFile(type, file)
}

/**
 * Validates the image type and triggers the appropriate scan simulation.
 * @param {'dish'|'menu'} type
 * @param {File} file
 */
function processScanFile(type, file) {
  if (!file.type.match(/image\/(jpeg|png)/)) {
    toast.add({ severity: 'warn', summary: t('scan.invalidImageType'), life: 3000 })
    return
  }
  if (type === 'dish') {
    nutritionStore.simulateDishScan(file.name)
  } else {
    nutritionStore.simulateMenuScan(
      file.name,
      currentUser.value?.dietaryRestrictions ?? [],
      currentUser.value?.medicalConditions ?? [],
    )
  }
}

</script>

<template>
  <div class="nl">

    <!-- Page header -->
    <div class="nl__page-header">
      <div>
        <h1 class="nl__title">{{ t('nutrition.dailyLog') }}</h1>
        <p class="nl__subtitle">{{ t('nutrition.dailyLogSubtitle') }}</p>
      </div>
      <div class="nl__header-actions">
        <ns-tabs v-model="activeTab" :tabs="nlTabs" />
        <pv-button
          v-if="activeTab === 'daily-log' && isViewingToday"
          icon="pi pi-plus"
          :label="t('nutrition.addFood')"
          @click="openSearch()"
        />
      </div>
    </div>

    <!-- Daily Log Tab -->
    <template v-if="activeTab === 'daily-log'">

      <!-- Date navigator (centered) -->
      <div class="nl__date-nav">
        <button
          class="date-arrow"
          :aria-label="t('nutrition.previousDay')"
          :disabled="isAtMinDate"
          @click="!isAtMinDate && nutritionStore.navigateDay(-1, accountCreatedAt)"
        >
          <i class="pi pi-chevron-left" aria-hidden="true" />
        </button>
        <div class="date-pill">
          <i class="pi pi-calendar" aria-hidden="true" />
          <span>{{ dateLabel }}</span>
        </div>
        <button
          class="date-arrow"
          :aria-label="t('nutrition.nextDay')"
          :disabled="isViewingToday"
          @click="!isViewingToday && nutritionStore.navigateDay(1)"
        >
          <i class="pi pi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <!-- Past day banner -->
      <div v-if="!isViewingToday" class="ns-banner ns-banner--info">
        <i class="pi pi-info-circle" aria-hidden="true" style="color:#3b82f6;font-size:1rem;flex-shrink:0;margin-top:1px" />
        <span style="font-size:0.8125rem;color:#1e40af">{{ t('nutrition.pastLogBanner') }}</span>
      </div>

      <!-- Daily Summary card (full-width) -->
      <div class="ns-panel daily-summary">
        <div class="daily-summary__title">{{ t('nutrition.dailySummary') }}</div>
        <div class="daily-summary__cols">
          <div class="ds-col">
            <div class="ds-col__label">{{ t('nutrition.caloriesLabel') }}</div>
            <div class="ds-col__val">{{ dailyCaloriesConsumed }}<span class="ds-col__unit">{{ t('macros.kcal') }}</span></div>
            <div class="ds-col__goal">/{{ calorieGoal }} {{ t('macros.kcal') }}</div>
            <div class="ds-col__bar"><div class="ds-col__bar-fill" style="background:var(--color-primary)" :style="{ width: Math.min(100, Math.round(dailyCaloriesConsumed/calorieGoal*100)) + '%' }" /></div>
          </div>
          <div class="ds-col">
            <div class="ds-col__label">{{ t('nutrition.protein') }}</div>
            <div class="ds-col__val">{{ Math.round((dailyMacros?.proteinG ?? 0) * 10) / 10 }}<span class="ds-col__unit">g</span></div>
            <div class="ds-col__goal">/{{ proteinGoal }} g</div>
            <div class="ds-col__bar"><div class="ds-col__bar-fill" style="background:var(--color-primary)" :style="{ width: Math.min(100, Math.round((dailyMacros?.proteinG??0)/proteinGoal*100)) + '%' }" /></div>
          </div>
          <div class="ds-col">
            <div class="ds-col__label">{{ t('nutrition.carbohydrates') }}</div>
            <div class="ds-col__val">{{ Math.round((dailyMacros?.carbsG ?? 0) * 10) / 10 }}<span class="ds-col__unit">g</span></div>
            <div class="ds-col__goal">/{{ carbsGoal }} g</div>
            <div class="ds-col__bar"><div class="ds-col__bar-fill" style="background:#f59e0b" :style="{ width: Math.min(100, Math.round((dailyMacros?.carbsG??0)/carbsGoal*100)) + '%' }" /></div>
          </div>
          <div class="ds-col">
            <div class="ds-col__label">{{ t('nutrition.fats') }}</div>
            <div class="ds-col__val">{{ Math.round((dailyMacros?.fatG ?? 0) * 10) / 10 }}<span class="ds-col__unit">g</span></div>
            <div class="ds-col__goal">/{{ fatGoal }} g</div>
            <div class="ds-col__bar"><div class="ds-col__bar-fill" style="background:#ef4444" :style="{ width: Math.min(100, Math.round((dailyMacros?.fatG??0)/fatGoal*100)) + '%' }" /></div>
          </div>
          <div class="ds-col">
            <div class="ds-col__label">{{ t('nutrition.fiber') }}</div>
            <div class="ds-col__val">{{ Math.round((dailyMacros?.fiberG ?? 0) * 10) / 10 }}<span class="ds-col__unit">g</span></div>
            <div class="ds-col__goal">/{{ fiberGoal }} g</div>
            <div class="ds-col__bar"><div class="ds-col__bar-fill" style="background:var(--color-success)" :style="{ width: Math.min(100, Math.round((dailyMacros?.fiberG??0)/fiberGoal*100)) + '%' }" /></div>
          </div>
        </div>
      </div>

      <!-- Calorie threshold banner -->
      <div
        v-if="calorieBannerLevel === '110'"
        class="ns-banner ns-banner--warning"
        role="status"
        aria-live="polite"
        style="border-color:#f97316;background:#fff7ed"
      >
        <i class="pi pi-exclamation-triangle" aria-hidden="true" style="color:#ea580c;font-size:1rem;flex-shrink:0;margin-top:1px" />
        <span style="font-size:0.8125rem;color:#9a3412">{{ t('nutrition.calorieBanner110') }}</span>
      </div>

      <div
        v-else-if="calorieBannerLevel === '130'"
        class="ns-banner ns-banner--danger"
        role="alert"
        aria-live="assertive"
      >
        <i class="pi pi-times-circle" aria-hidden="true" style="color:#dc2626;font-size:1rem;flex-shrink:0;margin-top:1px" />
        <span style="font-size:0.8125rem;color:#991b1b">{{ t('nutrition.calorieBanner130') }}</span>
      </div>

      <!-- Two-column layout -->
      <div class="nl__body">

        <!-- Meal panels -->
        <div class="nl__meals">
          <div v-if="!logsLoaded">
            <pv-skeleton v-for="i in 4" :key="i" height="100px" border-radius="12px" style="margin-bottom:8px" />
          </div>

          <template v-else>
            <div v-for="type in mealTypes" :key="type" class="meal-panel">
              <div class="meal-panel__header">
                <div class="meal-panel__title-wrap">
                  <span class="meal-panel__dot" :style="{ background: mealMeta[type].color }" />
                  <span class="meal-panel__title">{{ t(mealMeta[type].labelKey) }}</span>
                  <span class="meal-panel__total">{{ mealTotal(type) }} {{ t('macros.kcal') }}</span>
                </div>
                <button
                  v-if="isViewingToday"
                  class="add-meal-btn"
                  :aria-label="t('nutrition.addFoodTo', { meal: t(mealMeta[type].labelKey) })"
                  @click="openSearch(type)"
                >
                  <i class="pi pi-plus" aria-hidden="true" />
                  {{ t('nutrition.add') }}
                </button>
              </div>

              <div v-if="(logsByMealType[type] ?? []).length === 0" class="meal-panel__empty">
                {{ t('nutrition.noLogs') }}
              </div>
              <div v-else class="meal-panel__items">
                <div
                  v-for="log in logsByMealType[type]"
                  :key="log.id"
                  class="meal-item"
                  role="button"
                  tabindex="0"
                  :aria-label="t('nutrition.entryDetail')"
                  @click="openDetail(log)"
                  @keydown.enter="openDetail(log)"
                >
                  <div class="meal-item__info">
                    <span class="meal-item__name">{{ foodName(log) }}</span>
                    <span class="meal-item__qty">{{ log.quantityG }} g</span>
                  </div>
                  <div class="meal-item__right">
                    <span class="meal-item__kcal">{{ logKcal(log) }} {{ t('macros.kcal') }}</span>
                    <span class="meal-item__macros">
                      {{ t('macros.protein') }} {{ Math.round((log.macros?.().proteinG ?? 0)*10)/10 }}g ·
                      {{ t('macros.carbs') }} {{ Math.round((log.macros?.().carbsG   ?? 0)*10)/10 }}g ·
                      {{ t('macros.fat') }} {{ Math.round((log.macros?.().fatG     ?? 0)*10)/10 }}g
                    </span>
                  </div>
                  <button
                    v-if="isViewingToday"
                    class="meal-item__remove"
                    :aria-label="t('nutrition.remove')"
                    @click.stop="removeEntry(log.id)"
                  >
                    <i class="pi pi-times-circle" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Daily Balance sidebar -->
        <div class="nl__sidebar">
          <div class="ns-panel balance-panel">
            <div class="balance-title">{{ t('nutrition.dailyBalance') }}</div>

            <div class="balance-rows">
              <div class="balance-row">
                <span class="balance-row__label">{{ t('nutrition.dailyGoal') }}</span>
                <span class="balance-row__val">{{ calorieGoal }} {{ t('macros.kcal') }}</span>
              </div>
              <div class="balance-row">
                <span class="balance-row__label">{{ t('dashboard.caloriesConsumed') }}</span>
                <span class="balance-row__val">{{ dailyCaloriesConsumed }} {{ t('macros.kcal') }}</span>
              </div>
              <div v-if="todayCaloriesBurned > 0" class="balance-row">
                <span class="balance-row__label">{{ t('activity.caloriesBurned') }}</span>
                <span class="balance-row__val balance-row__val--burned">
                  +{{ todayCaloriesBurned }} {{ t('macros.kcal') }}
                </span>
              </div>
              <div class="balance-row balance-row--highlight">
                <span class="balance-row__label">{{ t('dashboard.caloriesRemaining') }}</span>
                <span class="balance-row__val balance-row__val--teal" :class="{ 'balance-row__val--danger': remaining === 0 }">
                  {{ remaining }} {{ t('macros.kcal') }}
                </span>
              </div>
            </div>

            <div class="balance-bar-wrap">
              <div class="ns-progress-bar-bg" style="height:8px">
                <div
                  class="ns-progress-bar-fill"
                  :style="{
                    width: goalPct + '%',
                    background: goalPct >= 100 ? 'var(--color-danger)' : 'var(--color-primary)'
                  }"
                />
              </div>
              <span class="balance-pct-label">{{ t('nutrition.goalConsumedPct', { n: goalPct }) }}</span>
            </div>

            <div
              v-if="isViewingToday && logsLoaded"
              class="streak-check"
              :class="streakMet ? 'streak-check--met' : 'streak-check--pending'"
              role="status"
            >
              <i
                class="pi"
                :class="streakMet ? 'pi-check-circle' : 'pi-clock'"
                aria-hidden="true"
              />
              <span>{{ streakMet ? t('nutrition.streakOnTrack') : t(streakBlockReason ?? 'nutrition.streakNotMet') }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Smart Scan Tab -->
    <template v-if="activeTab === 'smart-scan'">

      <div v-if="!canScanDish && !canScanMenu" class="scan-upgrade-banner">
        <div class="scan-upgrade-banner__icon-wrap">
          <i class="pi pi-lock" aria-hidden="true" />
        </div>
        <h3>{{ t('subscription.upgradeRequiresPro') }}</h3>
        <p>{{ t('scan.upgradeBannerBody') }}</p>
        <div class="scan-upgrade-banner__actions">
          <pv-button :label="t('subscription.upgradeNow', { plan: 'Pro' })" @click="$router.push({ name: 'profile-billing' })" />
          <pv-button :label="t('scan.viewPlans')" severity="secondary" outlined @click="$router.push({ name: 'profile-billing' })" />
        </div>
      </div>

      <div class="scan-grid">
        <!-- Dish scan — Pro+ -->
        <div class="scan-card scan-card--dish" :class="{ 'scan-card--locked': !canScanDish }">
          <div v-if="!canScanDish" class="scan-lock">
            <div class="scan-lock__icon-wrap">
              <i class="pi pi-lock" aria-hidden="true" />
            </div>
            <p class="scan-lock__title">{{ t('subscription.upgradeRequiresPro') }}</p>
            <p class="scan-lock__desc">{{ t('scan.dishLockDesc') }}</p>
            <pv-button :label="t('subscription.upgradeNow', { plan: 'Pro' })" size="small" @click="$router.push({ name: 'profile-billing' })" />
          </div>
          <template v-else>
            <div class="scan-card__head">
              <div class="scan-card__badge scan-card__badge--dish">
                <i class="pi pi-camera" aria-hidden="true" />
                {{ t('scan.scanDish') }}
              </div>
              <p class="scan-card__desc">{{ t('scan.scanDishDesc') }}</p>
            </div>

            <!-- Loading -->
            <template v-if="scanDishLoading">
              <pv-skeleton height="160px" border-radius="10px" />
              <div class="scan-analyzing__label">
                <i class="pi pi-spin pi-spinner" aria-hidden="true" />
                {{ t('scan.analyzingImage') }}
              </div>
            </template>

            <!-- Upload -->
            <template v-else>
              <div
                class="scan-drop"
                :class="{ 'scan-drop--over': scanDragOver.dish }"
                role="button"
                tabindex="0"
                :aria-label="t('scan.dropDishHere')"
                @dragover.prevent="scanDragOver.dish = true"
                @dragleave="scanDragOver.dish = false"
                @drop="handleDrop('dish', $event)"
                @click="triggerFileInput('dish')"
                @keydown.enter="triggerFileInput('dish')"
              >
                <i class="pi pi-upload scan-drop__icon" aria-hidden="true" />
                <span>{{ t('scan.dropDishHere') }}</span>
                <span class="scan-drop__hint">{{ t('scan.imageFormat') }}</span>
              </div>
              <div class="scan-card__actions">
                <pv-button icon="pi pi-camera" :label="t('scan.takePhoto')" @click="triggerFileInput('dish')" />
                <pv-button icon="pi pi-folder-open" :label="t('scan.uploadFile')" severity="secondary" outlined @click="triggerFileInput('dish')" />
                <span
                  v-if="isViewingToday"
                  class="scan-calorie-chip"
                  :class="{
                    'scan-calorie-chip--ok':     goalPctRaw >= 80  && goalPctRaw < 110,
                    'scan-calorie-chip--warn':   goalPctRaw >= 110 && goalPctRaw < 130,
                    'scan-calorie-chip--danger': goalPctRaw >= 130,
                    'scan-calorie-chip--neutral': goalPctRaw < 80,
                  }"
                  :aria-label="t('scan.calorieStatus', { pct: goalPctRaw })"
                >
                  <i
                    class="pi"
                    :class="{
                      'pi-check-circle':         goalPctRaw >= 80  && goalPctRaw < 110,
                      'pi-exclamation-triangle': goalPctRaw >= 110 && goalPctRaw < 130,
                      'pi-times-circle':         goalPctRaw >= 130,
                      'pi-chart-bar':            goalPctRaw < 80,
                    }"
                    aria-hidden="true"
                  />
                  {{ t('scan.calorieStatus', { pct: goalPctRaw }) }}
                </span>
              </div>
              <input id="scan-input-dish" type="file" accept="image/jpeg,image/png" hidden @change="onFileChange('dish', $event)" />
            </template>
          </template>
        </div>

        <!-- Menu scan — Premium only -->
        <div class="scan-card scan-card--menu" :class="{ 'scan-card--locked': !canScanMenu }">
          <div v-if="!canScanMenu" class="scan-lock">
            <div class="scan-lock__icon-wrap">
              <i class="pi pi-lock" aria-hidden="true" />
            </div>
            <p class="scan-lock__title">{{ t('subscription.upgradeRequiresPremium') }}</p>
            <p class="scan-lock__desc">{{ t('scan.menuLockDesc') }}</p>
            <pv-button :label="t('subscription.upgradeNow', { plan: 'Premium' })" size="small" @click="$router.push({ name: 'profile-billing' })" />
          </div>
          <template v-else>
            <div class="scan-card__head">
              <div class="scan-card__badge scan-card__badge--menu">
                <i class="pi pi-file" aria-hidden="true" />
                {{ t('scan.scanMenu') }}
              </div>
              <p class="scan-card__desc">{{ t('scan.scanMenuDesc') }}</p>
            </div>

            <!-- Loading -->
            <template v-if="scanMenuLoading">
              <pv-skeleton height="160px" border-radius="10px" />
              <div class="scan-analyzing__label">
                <i class="pi pi-spin pi-spinner" aria-hidden="true" />
                {{ t('scan.analyzingImage') }}
              </div>
            </template>

            <!-- Upload -->
            <template v-else>
              <div
                class="scan-drop"
                :class="{ 'scan-drop--over': scanDragOver.menu }"
                role="button"
                tabindex="0"
                :aria-label="t('scan.dropMenuHere')"
                @dragover.prevent="scanDragOver.menu = true"
                @dragleave="scanDragOver.menu = false"
                @drop="handleDrop('menu', $event)"
                @click="triggerFileInput('menu')"
                @keydown.enter="triggerFileInput('menu')"
              >
                <i class="pi pi-upload scan-drop__icon" aria-hidden="true" />
                <span>{{ t('scan.dropMenuHere') }}</span>
                <span class="scan-drop__hint">{{ t('scan.imageFormat') }}</span>
              </div>
              <div class="scan-card__actions">
                <pv-button icon="pi pi-camera" :label="t('scan.takePhoto')" @click="triggerFileInput('menu')" />
                <pv-button icon="pi pi-folder-open" :label="t('scan.uploadFile')" severity="secondary" outlined @click="triggerFileInput('menu')" />
                <span
                  v-if="isViewingToday"
                  class="scan-calorie-chip"
                  :class="{
                    'scan-calorie-chip--ok':     goalPctRaw >= 80  && goalPctRaw < 110,
                    'scan-calorie-chip--warn':   goalPctRaw >= 110 && goalPctRaw < 130,
                    'scan-calorie-chip--danger': goalPctRaw >= 130,
                    'scan-calorie-chip--neutral': goalPctRaw < 80,
                  }"
                  :aria-label="t('scan.calorieStatus', { pct: goalPctRaw })"
                >
                  <i
                    class="pi"
                    :class="{
                      'pi-check-circle':         goalPctRaw >= 80  && goalPctRaw < 110,
                      'pi-exclamation-triangle': goalPctRaw >= 110 && goalPctRaw < 130,
                      'pi-times-circle':         goalPctRaw >= 130,
                      'pi-chart-bar':            goalPctRaw < 80,
                    }"
                    aria-hidden="true"
                  />
                  {{ t('scan.calorieStatus', { pct: goalPctRaw }) }}
                </span>
              </div>
              <input id="scan-input-menu" type="file" accept="image/jpeg,image/png" hidden @change="onFileChange('menu', $event)" />
            </template>
          </template>
        </div>
      </div>
    </template>

    <!-- Entry detail modal -->
    <pv-dialog
      v-model:visible="showDetailModal"
      :header="selectedLog ? foodName(selectedLog) : ''"
      :modal="true"
      :draggable="false"
      style="width:420px;max-width:95vw"
    >
      <div v-if="selectedLog" class="detail-modal">
        <div class="detail-modal__meta">
          <span class="detail-modal__qty">{{ selectedLog.quantityG }}g</span>
          <span class="detail-modal__sep" aria-hidden="true">·</span>
          <span>{{ t(`meal.${selectedLog.mealType.value}`) }}</span>
        </div>
        <div class="detail-modal__grid" role="group" :aria-label="t('nutrition.entryDetail')">
          <div class="detail-stat detail-stat--cal">
            <span class="detail-stat__val">{{ Math.round(detailMacros?.calories ?? 0) }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.caloriesLabel') }}</span>
            <span class="detail-stat__unit">kcal</span>
          </div>
          <div class="detail-stat detail-stat--pro">
            <span class="detail-stat__val">{{ Math.round((detailMacros?.proteinG ?? 0) * 10) / 10 }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.protein') }}</span>
            <span class="detail-stat__unit">g</span>
          </div>
          <div class="detail-stat detail-stat--carb">
            <span class="detail-stat__val">{{ Math.round((detailMacros?.carbsG ?? 0) * 10) / 10 }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.carbs') }}</span>
            <span class="detail-stat__unit">g</span>
          </div>
          <div class="detail-stat detail-stat--fat">
            <span class="detail-stat__val">{{ Math.round((detailMacros?.fatG ?? 0) * 10) / 10 }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.fat') }}</span>
            <span class="detail-stat__unit">g</span>
          </div>
          <div class="detail-stat detail-stat--fiber">
            <span class="detail-stat__val">{{ Math.round((detailMacros?.fiberG ?? 0) * 10) / 10 }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.fiber') }}</span>
            <span class="detail-stat__unit">g</span>
          </div>
          <div class="detail-stat detail-stat--sugar">
            <span class="detail-stat__val">{{ Math.round((detailMacros?.sugarG ?? 0) * 10) / 10 }}</span>
            <span class="detail-stat__lbl">{{ t('nutrition.sugar') }}</span>
            <span class="detail-stat__unit">g</span>
          </div>
        </div>
      </div>
      <template #footer>
        <pv-button
          v-if="isViewingToday"
          :label="t('nutrition.editQuantity')"
          icon="pi pi-pencil"
          icon-pos="right"
          @click="openEdit"
        />
        <pv-button :label="t('common.close')" severity="secondary" text @click="showDetailModal = false" />
      </template>
    </pv-dialog>

    <!-- Edit quantity modal -->
    <pv-dialog
      v-model:visible="showEditModal"
      :header="t('nutrition.editQuantity')"
      :modal="true"
      :draggable="false"
      style="width:400px;max-width:95vw"
    >
      <div v-if="selectedLog" class="edit-modal">
        <p class="edit-modal__food">{{ foodName(selectedLog) }}</p>

        <div class="add-modal__field">
          <label for="edit-grams">{{ t('nutrition.quantity') }}</label>
          <pv-input-number
            id="edit-grams"
            v-model="editGrams"
            :min="1"
            :max="2000"
            :aria-label="t('nutrition.quantity')"
            class="w-full"
            suffix="g"
          />
        </div>

        <div class="add-modal__stats" role="group" :aria-label="t('nutrition.caloriesLabel')">
          <div class="stat-box">
            <span class="stat-box__val">{{ editLiveKcal }}</span>
            <span class="stat-box__lbl">{{ t('nutrition.caloriesLabel') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ editLiveProtein }}g</span>
            <span class="stat-box__lbl">{{ t('nutrition.protein') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ editLiveCarbs }}g</span>
            <span class="stat-box__lbl">{{ t('nutrition.carbs') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ editLiveFat }}g</span>
            <span class="stat-box__lbl">{{ t('nutrition.fat') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" severity="secondary" text @click="showEditModal = false" />
        <pv-button :label="t('nutrition.updateEntry')" @click="confirmEdit" />
      </template>
    </pv-dialog>

    <!-- Search dialog -->
    <pv-dialog
      v-model:visible="showSearch"
      :header="t('nutrition.searchFood')"
      :modal="true"
      :draggable="false"
      style="width:480px;max-width:95vw"
      position="topright"
    >
      <pv-input-text
        v-model="searchQuery"
        :placeholder="t('nutrition.searchFood')"
        :aria-label="t('nutrition.searchFood')"
        class="w-full mb-3"
        autofocus
        @input="onSearchInput"
      />
      <div v-if="!searchQuery.trim()" class="search-empty">
        <i class="pi pi-search" aria-hidden="true" />
        {{ t('nutrition.searchHint') }}
      </div>
      <div v-else-if="!searchResults.length" class="search-empty">
        <i class="pi pi-times-circle" aria-hidden="true" />
        {{ t('nutrition.noResults') }}
      </div>
      <div v-else class="search-results" role="listbox">
        <div
          v-for="food in searchResults"
          :key="food.id"
          class="search-item"
          role="option"
          tabindex="0"
          @click="selectFood(food)"
          @keydown.enter="selectFood(food)"
        >
          <div class="search-item__info">
            <span class="search-item__name">{{ t(food.key) }}</span>
            <span class="search-item__source">{{ food.source ?? '' }}</span>
          </div>
          <span class="search-item__kcal">{{ food.caloriesPer100g }} {{ t('nutrition.per100g') }}</span>
        </div>
      </div>
    </pv-dialog>

    <!-- Add to log modal -->
    <pv-dialog
      v-model:visible="showAddModal"
      :header="t('nutrition.addToLog')"
      :modal="true"
      :draggable="false"
      style="width:440px;max-width:95vw"
    >
      <div v-if="selectedFood" class="add-modal">

        <p class="add-modal__subtitle">
          {{ t('nutrition.addingTo') }}: <strong>{{ t(`meal.${addMealType}`) }}</strong>
        </p>

        <div class="food-card" role="region" :aria-label="t(selectedFood.key)">
          <div class="food-card__name">{{ t(selectedFood.key) }}</div>
          <div class="food-card__base">
            {{ t('nutrition.base100g') }} ·
            {{ Math.round(baseMacros?.calories ?? 0) }} kcal ·
            P {{ Math.round((baseMacros?.proteinG ?? 0) * 10) / 10 }}g ·
            C {{ Math.round((baseMacros?.carbsG   ?? 0) * 10) / 10 }}g ·
            G {{ Math.round((baseMacros?.fatG     ?? 0) * 10) / 10 }}g
          </div>
        </div>

        <div class="add-modal__field">
          <label for="add-grams">{{ t('nutrition.quantity') }}</label>
          <pv-input-number
            id="add-grams"
            v-model="addGrams"
            :min="1"
            :max="2000"
            :aria-label="t('nutrition.quantity')"
            class="w-full"
            suffix="g"
          />
        </div>

        <div class="add-modal__field">
          <label>{{ t('nutrition.mealType') }}</label>
          <div class="meal-type-tabs">
            <button
              v-for="opt in mealOptions"
              :key="opt.value"
              class="meal-type-tab"
              :class="{ 'meal-type-tab--active': addMealType === opt.value }"
              @click="addMealType = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="add-modal__stats" role="group" :aria-label="t('nutrition.caloriesLabel')">
          <div class="stat-box">
            <span class="stat-box__val">{{ liveKcal }}</span>
            <span class="stat-box__lbl">{{ t('nutrition.caloriesLabel') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ liveProtein }}g</span>
            <span class="stat-box__lbl">{{ t('dashboard.protein') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ liveCarbs }}g</span>
            <span class="stat-box__lbl">{{ t('dashboard.carbs') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-box__val">{{ liveFat }}g</span>
            <span class="stat-box__lbl">{{ t('dashboard.fat') }}</span>
          </div>
        </div>

        <div v-if="selectedFoodConflicts.length" class="add-modal__restriction-warn" role="alert" aria-live="assertive">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          {{ t('nutrition.restrictionWarning') }}
        </div>

        <div
          class="add-modal__impact"
          :class="addModalBannerLevel === '130' ? 'add-modal__impact--over' : addModalBannerLevel === '110' ? 'add-modal__impact--warn' : 'add-modal__impact--ok'"
          role="status"
          :aria-live="addModalBannerLevel ? 'assertive' : 'polite'"
        >
          <div class="ns-progress-bar-bg">
            <div
              class="ns-progress-bar-fill"
              :style="{
                width: willReachPct + '%',
                background: addModalBannerLevel === '130' ? 'var(--color-danger)' : addModalBannerLevel === '110' ? '#f97316' : 'var(--color-primary)'
              }"
            />
          </div>
          <span class="add-modal__impact-text">
            <i
              v-if="addModalBannerLevel === '130'"
              class="pi pi-times-circle"
              aria-hidden="true"
            />
            <i
              v-else-if="addModalBannerLevel === '110'"
              class="pi pi-exclamation-triangle"
              aria-hidden="true"
            />
            <template v-if="addModalBannerLevel === '130'">{{ t('nutrition.willExceed130') }}</template>
            <template v-else-if="addModalBannerLevel === '110'">{{ t('nutrition.willExceed110') }}</template>
            <template v-else>{{ t('nutrition.willReach', { pct: willReachPct }) }}</template>
          </span>
        </div>

      </div>

      <template #footer>
        <pv-button :label="t('nutrition.cancel')" severity="secondary" text @click="showAddModal = false" />
        <pv-button :label="t('nutrition.confirm')" rounded @click="confirmAdd" />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.nl { display: flex; flex-direction: column; gap: 1rem; max-width: 100%; }

/* Page header */
.nl__page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.nl__title    { font-size: 1.875rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.03em; line-height: 1.15; }
.nl__subtitle { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 0.25rem; }
.nl__header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

/* Date navigator */
.nl__date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.date-arrow {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  transition: all 0.12s;
}
.date-arrow:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.date-arrow:disabled { opacity: 0.35; cursor: default; }

.date-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.25rem;
  background: #fff;
  border: 1.5px solid var(--color-primary);
  border-radius: 99px;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

/* Daily Summary */
.daily-summary {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #edeae7;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
  padding: 1.25rem 1.5rem;
}
.daily-summary__title { font-size: 1rem; font-weight: 700; color: var(--color-text); margin-bottom: 1.25rem; }
.daily-summary__cols {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}
.ds-col { display: flex; flex-direction: column; gap: 0.2rem; padding-right: 0.75rem; border-right: 1px solid #f0ece9; }
.ds-col:last-child { border-right: none; padding-right: 0; }
.ds-col__label { font-size: 0.7rem; color: var(--color-text-secondary); font-weight: 500; }
.ds-col__val {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.ds-col__unit { font-size: 0.875rem; font-weight: 600; letter-spacing: 0; }
.ds-col__goal { font-size: 0.7rem; color: #b0aba6; }
.ds-col__bar {
  height: 5px;
  border-radius: 99px;
  background: #f0ece9;
  overflow: hidden;
  margin-top: 0.5rem;
}
.ds-col__bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
  max-width: 100%;
}
.ds-col__bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; max-width: 100%; }

/* Two-column layout */
.nl__body { display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start; }
.nl__meals { display: flex; flex-direction: column; gap: 0.625rem; }
.nl__sidebar { position: sticky; top: 1rem; }

/* Meal panels */
.meal-panel {
  background: #fff;
  border: 1px solid #e8e5e2;
  border-radius: 14px;
  overflow: hidden;
}
.meal-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid #f5f1ee;
}
.meal-panel__title-wrap { display: flex; align-items: center; gap: 0.5rem; }
.meal-panel__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.meal-panel__title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text); }
.meal-panel__total { font-size: 0.8125rem; font-weight: 500; color: var(--color-text-secondary); margin-left: 0.25rem; }

.add-meal-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: 7px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  transition: all 0.12s;
}
.add-meal-btn:hover { background: var(--color-primary); color: #fff; }

.meal-panel__empty {
  padding: 1.125rem 1.25rem;
  font-size: 0.8125rem;
  color: #c9c3be;
  font-style: italic;
}
.meal-panel__items { padding: 0 1.125rem; }

/* Balance panel */
.balance-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #edeae7;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.balance-title  { font-size: 1.0625rem; font-weight: 700; color: var(--color-text); }
.balance-rows   { display: flex; flex-direction: column; gap: 0.625rem; }
.balance-row    { display: flex; justify-content: space-between; align-items: center; }
.balance-row--highlight { padding-top: 0.5rem; border-top: 1px solid #f0ece9; margin-top: 0.125rem; }
.balance-row__label { font-size: 0.875rem; color: var(--color-text-secondary); }
.balance-row__val   { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
.balance-row__val--teal   { color: var(--color-primary); font-size: 1rem; }
.balance-row__val--danger  { color: var(--color-danger); }
.balance-row__val--burned  { color: #10b981; font-weight: 700; }
.balance-bar-wrap   { display: flex; flex-direction: column; gap: 0.375rem; }
.balance-pct-label  { font-size: 0.6875rem; color: #aaa; }

.streak-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}
.streak-check--met     { background: #f0fdf4; color: #166534; }
.streak-check--pending { background: #f5f3f1; color: var(--color-text-secondary); }
.streak-check .pi      { font-size: 0.9375rem; flex-shrink: 0; }
.streak-check--met .pi     { color: #22c55e; }
.streak-check--pending .pi { color: #b0aba6; }

/* Meal item overrides for new layout */
.meal-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f5f1ee;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s;
  margin: 0 -0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
.meal-item:hover { background: #faf8f6; }
.meal-item:last-child { border-bottom: none; }
.meal-item__info  { flex: 1; display: flex; flex-direction: column; gap: 0.125rem; }
.meal-item__name  { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
.meal-item__qty   { font-size: 0.75rem; color: var(--color-text-secondary); }
.meal-item__right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.125rem; }
.meal-item__kcal  { font-size: 0.875rem; font-weight: 700; color: var(--color-primary); white-space: nowrap; }
.meal-item__macros { font-size: 0.6875rem; color: var(--color-text-secondary); white-space: nowrap; }
.meal-item__remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #d1c8c2;
  font-size: 1.125rem;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  flex-shrink: 0;
  margin-top: 2px;
}
.meal-item__remove:hover { color: var(--color-danger); }

/* Detail modal */
.detail-modal { display: flex; flex-direction: column; gap: 1rem; }

.detail-modal__meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.detail-modal__qty  { font-weight: 700; color: var(--color-text); }
.detail-modal__sep  { color: #d0ccc8; }

.detail-modal__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.detail-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-radius: 10px;
  gap: 0.125rem;
  text-align: center;
}
.detail-stat--cal   { background: rgba(249,115,22,0.08); }
.detail-stat--pro   { background: rgba(59,130,246,0.08); }
.detail-stat--carb  { background: rgba(245,158,11,0.08); }
.detail-stat--fat   { background: rgba(168,85,247,0.08); }
.detail-stat--fiber { background: rgba(16,185,129,0.08); }
.detail-stat--sugar { background: rgba(236,72,153,0.08); }

.detail-stat__val  { font-size: 1.25rem; font-weight: 800; color: var(--color-text); line-height: 1.1; }
.detail-stat__lbl  { font-size: 0.6875rem; color: var(--color-text-secondary); font-weight: 500; }
.detail-stat__unit { font-size: 0.6875rem; color: #bbb; }

/* Edit modal */
.edit-modal { display: flex; flex-direction: column; gap: 1rem; }
.edit-modal__food { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); margin: 0; }

/* Search */
.search-results { display: flex; flex-direction: column; max-height: 300px; overflow-y: auto; }
.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}
.search-item:hover, .search-item:focus { background: #faf8f6; outline: none; }
.search-item__info { display: flex; flex-direction: column; gap: 0.1rem; }
.search-item__name   { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }
.search-item__source { font-size: 0.7rem; color: #bbb; text-transform: uppercase; letter-spacing: 0.04em; }
.search-item__kcal   { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); }
.search-empty { display: flex; align-items: center; gap: 0.5rem; justify-content: center; color: #bbb; padding: 1.5rem 1rem; font-size: 0.875rem; }

/* Add modal */
.add-modal { display: flex; flex-direction: column; gap: 1rem; }

.add-modal__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: -0.25rem;
}

.food-card {
  background: #f5f3f1;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.food-card__name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}
.food-card__base {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.add-modal__field { display: flex; flex-direction: column; gap: 0.375rem; }
.add-modal__field label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.meal-type-tabs { display: flex; gap: 0.375rem; flex-wrap: wrap; }
.meal-type-tab {
  padding: 0.35rem 0.875rem;
  border-radius: 99px;
  border: 1.5px solid #d9d4cf;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.meal-type-tab:hover:not(.meal-type-tab--active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.meal-type-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.add-modal__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
.stat-box {
  background: #f5f3f1;
  border-radius: 10px;
  padding: 0.625rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.stat-box__val {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.1;
}
.stat-box__lbl {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.add-modal__restriction-warn {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: #92400e;
  line-height: 1.4;
}

.add-modal__restriction-warn .pi {
  font-size: 0.875rem;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 1px;
}

.add-modal__impact {
  border-radius: 10px;
  padding: 0.75rem 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.add-modal__impact--ok   { background: #f0fdf4; }
.add-modal__impact--warn { background: #fff7ed; }
.add-modal__impact--over { background: #fff5f5; }
.add-modal__impact-text {
  font-size: 0.8125rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-secondary);
}
.add-modal__impact--warn .add-modal__impact-text { color: #ea580c; }
.add-modal__impact--over .add-modal__impact-text { color: var(--color-danger); }

/* Smart Scan */
.scan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.scan-card {
  border-radius: 14px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 300px;
}
.scan-card--dish { border-top: 3px solid #10b981; }
.scan-card--menu { border-top: 3px solid #8b5cf6; }
.scan-card--locked { background: #fafaf9; }

.scan-card__head { display: flex; flex-direction: column; gap: 0.5rem; }

.scan-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 700;
  width: fit-content;
}
.scan-card__badge--dish { background: #d1fae5; color: #065f46; }
.scan-card__badge--menu { background: #ede9fe; color: #4c1d95; }
.scan-card__desc { font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.5; }

.scan-drop {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  flex: 1;
}
.scan-drop:hover, .scan-drop--over {
  border-color: var(--color-primary);
  background: rgba(80,139,137,0.04);
}
.scan-drop__icon { font-size: 1.5rem; color: #d1cac5; margin-bottom: 0.25rem; }
.scan-drop span { font-size: 0.8125rem; color: var(--color-text-secondary); }
.scan-drop__hint { font-size: 0.7rem; color: #bbb; }

.scan-card__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.scan-calorie-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.625rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.scan-calorie-chip--neutral { background: #f5f3f1; color: var(--color-text-secondary); }
.scan-calorie-chip--ok      { background: #dcfce7; color: #166534; }
.scan-calorie-chip--warn    { background: #ffedd5; color: #c2410c; }
.scan-calorie-chip--danger  { background: #fee2e2; color: #991b1b; }

.scan-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.625rem;
  text-align: center;
}
.scan-lock__icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f5f0ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #c4bfba;
}
.scan-lock__title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text); }
.scan-lock__desc  { font-size: 0.8125rem; color: var(--color-text-secondary); max-width: 220px; }

.scan-upgrade-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2.5rem;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.scan-upgrade-banner__icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #f5f0ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--color-primary);
}
.scan-upgrade-banner h3 { font-size: 1.1rem; color: var(--color-text); margin: 0; }
.scan-upgrade-banner p  { font-size: 0.875rem; color: var(--color-text-secondary); max-width: 380px; margin: 0; }
.scan-upgrade-banner__actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

/* Scan simulation results */
.scan-analyzing__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-top: 0.75rem;
}

.scan-result { display: flex; flex-direction: column; gap: 0.875rem; }

.scan-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scan-result__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.625rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
}

.scan-result__reset {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Poppins', sans-serif;
  transition: border-color 0.12s, color 0.12s;
}
.scan-result__reset:hover { border-color: var(--color-primary); color: var(--color-primary); }

.scan-result__subtitle {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.scan-ingredients { display: flex; flex-direction: column; gap: 0.5rem; }

.scan-ingredient {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  background: #faf8f6;
  border-radius: 10px;
}

.scan-ingredient__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scan-ingredient__name { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }

.scan-ingredient__portion {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(80,139,137,0.1);
  border-radius: 99px;
  padding: 0.1rem 0.5rem;
}

.scan-ingredient__macros { display: flex; gap: 0.3rem; flex-wrap: wrap; }

.scan-mac {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}
.scan-mac--cal  { background: rgba(249,115,22,0.1);  color: #c2410c; }
.scan-mac--pro  { background: rgba(59,130,246,0.1);  color: #1d4ed8; }
.scan-mac--carb { background: rgba(245,158,11,0.1);  color: #b45309; }
.scan-mac--fat  { background: rgba(168,85,247,0.1);  color: #7e22ce; }

.scan-ingredient__conf { display: flex; align-items: center; gap: 0.5rem; }

.conf-bar {
  flex: 1;
  height: 4px;
  background: #edeae7;
  border-radius: 99px;
  overflow: hidden;
}
.conf-bar__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 99px;
  transition: width 0.4s ease;
}
.conf-pct { font-size: 0.6875rem; color: var(--color-text-secondary); min-width: 2.25rem; text-align: right; }

.scan-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: #f0ece9;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.scan-total__label { font-size: 0.75rem; font-weight: 700; color: var(--color-text); }
.scan-total__macros { display: flex; gap: 0.75rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); flex-wrap: wrap; }

.scan-add-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid #edeae7;
}
.scan-add-row__label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); white-space: nowrap; }

/* Menu recommendations */
.menu-recs {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 2px;
}

.menu-rec {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  background: #faf8f6;
  border-radius: 10px;
  border-left: 3px solid #10b981;
}
.menu-rec--unsafe { border-left-color: #f59e0b; background: #fffbf0; }

.menu-rec__rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e8e5e2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text);
  flex-shrink: 0;
}

.menu-rec__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }

.menu-rec__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.menu-rec__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-rec__score {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
}
.menu-rec__score--good { background: #d1fae5; color: #065f46; }
.menu-rec__score--avg  { background: #fef3c7; color: #92400e; }

.menu-rec__flags {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  color: #b45309;
}

.menu-rec__macros {
  display: flex;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .daily-summary__cols { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .nl__page-header { flex-direction: column; align-items: flex-start; }
  .nl__body    { grid-template-columns: 1fr; }
  .nl__sidebar { position: static; }
  .scan-grid   { grid-template-columns: 1fr; }
  .daily-summary__cols { grid-template-columns: repeat(2, 1fr); }
  .nl__title { font-size: 1.5rem; }
}
</style>
