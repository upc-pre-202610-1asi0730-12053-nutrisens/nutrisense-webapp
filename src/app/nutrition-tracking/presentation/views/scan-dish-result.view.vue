<!-- PATH: src/app/nutrition-tracking/presentation/views/scan-dish-result.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useNutritionTrackingStore } from '../../application/nutrition-tracking.store.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'

const { t } = useI18n()
const router    = useRouter()
const toast     = useToast()
const store     = useNutritionTrackingStore()
const bodyStore = useBodyHealthMetricsStore()

const { dishScanResult, isViewingToday, dailyCaloriesConsumed } = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''

onMounted(() => {
  if (!dishScanResult.value) {
    router.replace({ name: 'nutrition-log', query: { tab: 'smart-scan' } })
  }
  bodyStore.fetchUserGoal(userId)
})

/** @type {import('vue').Ref<'breakfast'|'lunch'|'snack'|'dinner'>} */
const selectedMeal = ref('dinner')

const mealOptions = computed(() => [
  { label: t('meal.breakfast'), value: 'breakfast' },
  { label: t('meal.lunch'),     value: 'lunch'     },
  { label: t('meal.snack'),     value: 'snack'     },
  { label: t('meal.dinner'),    value: 'dinner'    },
])

const calorieGoal = computed(() => bodyStore.userGoal?.macroTargets?.dailyCalorieTarget ?? 1911)

/**
 * Totals aggregated across all detected items.
 * @type {import('vue').ComputedRef<{calories:number,proteinG:number,carbsG:number,fatG:number}>}
 */
const totals = computed(() => {
  if (!dishScanResult.value) return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  return {
    calories: Math.round(dishScanResult.value.totalMacros.calories),
    proteinG: Math.round(dishScanResult.value.totalMacros.proteinG * 10) / 10,
    carbsG:   Math.round(dishScanResult.value.totalMacros.carbsG   * 10) / 10,
    fatG:     Math.round(dishScanResult.value.totalMacros.fatG     * 10) / 10,
  }
})

const projectedPct = computed(() =>
  Math.round((dailyCaloriesConsumed.value + totals.value.calories) / calorieGoal.value * 100)
)

/**
 * @returns {'80'|'110'|'130'|null}
 */
const dishBannerLevel = computed(() => {
  if (!isViewingToday.value) return null
  if (projectedPct.value >= 130) return '130'
  if (projectedPct.value >= 110) return '110'
  if (projectedPct.value >= 80)  return '80'
  return null
})

/** Adds all detected dish items to the selected meal in the nutrition log. */
function addAllToLog() {
  if (!dishScanResult.value || !isViewingToday.value) return

  const items   = dishScanResult.value.detectedItems
  const loggable = items.filter(({ food }) => food?.id != null)

  if (loggable.length === 0) {
    toast.add({ severity: 'warn', summary: t('scan.nothingToLog'), life: 3000 })
    return
  }

  loggable.forEach(({ food, estimatedGrams }) => {
    store.addToLog(userId, food.id, estimatedGrams, selectedMeal.value, 'scan-dish')
  })

  toast.add({
    severity: 'success',
    summary: t('scan.addedToLog', { meal: t(`meal.${selectedMeal.value}`) }),
    life: 2500,
  })
  store.resetDishScan()
  router.push({ name: 'nutrition-log' })
}

/** Clears the current scan result and returns to the scan tab. */
function scanAgain() {
  store.resetDishScan()
  router.push({ name: 'nutrition-log', query: { tab: 'smart-scan' } })
}
</script>

<template>
  <div v-if="dishScanResult" class="sdr">

    <!-- Header -->
    <div class="sdr__header">
      <div>
        <h1 class="sdr__title">{{ t('scan.dishResultTitle') }}</h1>
        <p class="sdr__subtitle">{{ t('scan.dishResultSubtitle') }}</p>
      </div>
      <div class="sdr__header-actions">
        <button class="sdr__action-btn" :aria-label="t('scan.backToScan')" @click="scanAgain">
          <i class="pi pi-refresh" aria-hidden="true" />
          {{ t('scan.backToScan') }}
        </button>
        <pv-button
          icon="pi pi-calendar"
          :label="t('scan.goToLog')"
          severity="secondary"
          outlined
          size="small"
          @click="router.push({ name: 'nutrition-log' })"
        />
      </div>
    </div>

    <!-- Status badge -->
    <div class="sdr__status-row">
      <span class="sdr__badge">
        <i class="pi pi-check-circle" aria-hidden="true" />
        {{ t('scan.scanComplete') }}
      </span>
      <span class="sdr__image-name" :aria-label="dishScanResult.imageName">
        <i class="pi pi-image" aria-hidden="true" />
        {{ dishScanResult.imageName }}
      </span>
    </div>

    <!-- Fallback: nothing detected -->
    <div v-if="dishScanResult.detectedItems.length === 0" class="sdr__empty">
      <i class="pi pi-search" aria-hidden="true" />
      <h2 class="sdr__empty-title">{{ t('scan.noDishesTitle') }}</h2>
      <p class="sdr__empty-desc">{{ t('scan.noDishesDesc') }}</p>
      <pv-button :label="t('scan.scanAgain')" icon="pi pi-refresh" @click="scanAgain" />
    </div>

    <div v-else class="sdr__body">

      <!-- Detected ingredients -->
      <section class="sdr__section" aria-labelledby="sdr-ingredients-title">
        <h2 id="sdr-ingredients-title" class="sdr__section-title">
          <i class="pi pi-list" aria-hidden="true" />
          {{ t('scan.detectedIngredients') }}
        </h2>

        <div class="sdr__ingredient-list">
          <div
            v-for="(item, idx) in dishScanResult.detectedItems"
            :key="idx"
            class="sdr__ingredient"
          >
            <div class="sdr__ing-top">
              <span class="sdr__ing-name">{{ item.food.name }}</span>
              <span class="sdr__ing-portion">~{{ item.estimatedGrams }}g</span>
            </div>

            <div class="sdr__ing-macros">
              <span class="sdr__mac sdr__mac--cal">
                {{ Math.round(item.food.macrosForQuantity(item.estimatedGrams).calories) }} kcal
              </span>
              <span class="sdr__mac sdr__mac--pro">
                P {{ Math.round(item.food.macrosForQuantity(item.estimatedGrams).proteinG * 10) / 10 }}g
              </span>
              <span class="sdr__mac sdr__mac--carb">
                C {{ Math.round(item.food.macrosForQuantity(item.estimatedGrams).carbsG * 10) / 10 }}g
              </span>
              <span class="sdr__mac sdr__mac--fat">
                G {{ Math.round(item.food.macrosForQuantity(item.estimatedGrams).fatG * 10) / 10 }}g
              </span>
            </div>

            <div class="sdr__conf-row">
              <div
                class="sdr__conf-bar"
                role="progressbar"
                :aria-valuenow="Math.round(item.confidence * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="t('scan.confidence')"
              >
                <div class="sdr__conf-fill" :style="{ width: Math.round(item.confidence * 100) + '%' }" />
              </div>
              <span class="sdr__conf-pct">{{ Math.round(item.confidence * 100) }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Totals + Add action -->
      <aside class="sdr__aside">

        <!-- Total macros -->
        <div class="sdr__totals-card">
          <h3 class="sdr__totals-title">{{ t('scan.totalNutrition') }}</h3>
          <div class="sdr__totals-grid">
            <div class="sdr__total-stat sdr__total-stat--cal">
              <span class="sdr__total-val">{{ totals.calories }}</span>
              <span class="sdr__total-lbl">kcal</span>
            </div>
            <div class="sdr__total-stat sdr__total-stat--pro">
              <span class="sdr__total-val">{{ totals.proteinG }}g</span>
              <span class="sdr__total-lbl">{{ t('nutrition.protein') }}</span>
            </div>
            <div class="sdr__total-stat sdr__total-stat--carb">
              <span class="sdr__total-val">{{ totals.carbsG }}g</span>
              <span class="sdr__total-lbl">{{ t('nutrition.carbs') }}</span>
            </div>
            <div class="sdr__total-stat sdr__total-stat--fat">
              <span class="sdr__total-val">{{ totals.fatG }}g</span>
              <span class="sdr__total-lbl">{{ t('nutrition.fat') }}</span>
            </div>
          </div>
        </div>

        <!-- Add to log panel -->
        <div v-if="isViewingToday" class="sdr__add-panel">
          <h3 class="sdr__add-title">{{ t('scan.scanMealType') }}</h3>

          <div class="sdr__meal-tabs" role="radiogroup" :aria-label="t('scan.selectMealType')">
            <button
              v-for="opt in mealOptions"
              :key="opt.value"
              class="sdr__meal-tab"
              :class="{ 'sdr__meal-tab--active': selectedMeal === opt.value }"
              role="radio"
              :aria-checked="selectedMeal === opt.value"
              @click="selectedMeal = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <div
            v-if="dishBannerLevel === '80'"
            class="sdr__calorie-banner sdr__calorie-banner--ok"
            role="status"
            aria-live="polite"
          >
            <i class="pi pi-check-circle" aria-hidden="true" />
            <span>{{ t('scan.willReach80') }}</span>
          </div>
          <div
            v-else-if="dishBannerLevel === '110'"
            class="sdr__calorie-banner sdr__calorie-banner--warn"
            role="status"
            aria-live="polite"
          >
            <i class="pi pi-exclamation-triangle" aria-hidden="true" />
            <span>{{ t('scan.willExceed110') }}</span>
          </div>
          <div
            v-else-if="dishBannerLevel === '130'"
            class="sdr__calorie-banner sdr__calorie-banner--danger"
            role="alert"
            aria-live="assertive"
          >
            <i class="pi pi-times-circle" aria-hidden="true" />
            <span>{{ t('scan.willExceed130') }}</span>
          </div>

          <div class="sdr__add-row">
            <pv-button
              icon="pi pi-plus"
              :label="t('scan.addAllToLog')"
              class="w-full"
              @click="addAllToLog"
            />
            <span
              class="sdr__calorie-chip"
              :class="{
                'sdr__calorie-chip--ok':      dishBannerLevel === '80',
                'sdr__calorie-chip--warn':    dishBannerLevel === '110',
                'sdr__calorie-chip--danger':  dishBannerLevel === '130',
                'sdr__calorie-chip--neutral': !dishBannerLevel,
              }"
              :aria-label="t('scan.calorieStatus', { pct: projectedPct })"
            >
              <i
                class="pi"
                :class="{
                  'pi-check-circle':         dishBannerLevel === '80',
                  'pi-exclamation-triangle': dishBannerLevel === '110',
                  'pi-times-circle':         dishBannerLevel === '130',
                  'pi-chart-bar':            !dishBannerLevel,
                }"
                aria-hidden="true"
              />
              {{ t('scan.calorieStatus', { pct: projectedPct }) }}
            </span>
          </div>
        </div>

        <div v-else class="sdr__past-notice">
          <i class="pi pi-info-circle" aria-hidden="true" />
          <span>{{ t('nutrition.pastLogBanner') }}</span>
        </div>

      </aside>
    </div>

  </div>
</template>

<style scoped>
.sdr__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 3rem 1.5rem;
  border: 1px dashed var(--surface-border, #d1d5db);
  border-radius: 1rem;
}
.sdr__empty i {
  font-size: 2.5rem;
  color: var(--text-color-secondary, #6b7280);
}
.sdr__empty-title { margin: 0; font-size: 1.25rem; }
.sdr__empty-desc {
  margin: 0 0 0.5rem;
  max-width: 28rem;
  color: var(--text-color-secondary, #6b7280);
}
.sdr {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 100%;
}

/* ── Header ─────────────────────────────── */
.sdr__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.sdr__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.125rem;
}

.sdr__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.sdr__header-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.sdr__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.875rem;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s;
}

.sdr__action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── Status row ─────────────────────────── */
.sdr__status-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-wrap: wrap;
}

.sdr__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 700;
}

.sdr__image-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

/* ── Body: 2-col ────────────────────────── */
.sdr__body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  align-items: start;
}

/* ── Section ────────────────────────────── */
.sdr__section {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.25rem;
}

.sdr__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 1rem;
}

/* ── Ingredient list ────────────────────── */
.sdr__ingredient-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.sdr__ingredient {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  background: #faf8f6;
  border-radius: 10px;
  border-left: 3px solid var(--color-primary);
}

.sdr__ing-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sdr__ing-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.sdr__ing-portion {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(80, 139, 137, 0.1);
  border-radius: 99px;
  padding: 0.15rem 0.625rem;
}

.sdr__ing-macros {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.sdr__mac {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.sdr__mac--cal  { background: rgba(249, 115, 22, 0.1);  color: #c2410c; }
.sdr__mac--pro  { background: rgba(59, 130, 246, 0.1);  color: #1d4ed8; }
.sdr__mac--carb { background: rgba(245, 158, 11, 0.1);  color: #b45309; }
.sdr__mac--fat  { background: rgba(168, 85, 247, 0.1);  color: #7e22ce; }

/* ── Confidence bar ─────────────────────── */
.sdr__conf-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sdr__conf-bar {
  flex: 1;
  height: 4px;
  background: #edeae7;
  border-radius: 99px;
  overflow: hidden;
}

.sdr__conf-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.sdr__conf-pct {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  min-width: 2.5rem;
  text-align: right;
}

/* ── Aside ──────────────────────────────── */
.sdr__aside {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Totals card ────────────────────────── */
.sdr__totals-card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.25rem;
}

.sdr__totals-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.875rem;
}

.sdr__totals-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.sdr__total-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-radius: 10px;
  gap: 0.125rem;
  text-align: center;
}

.sdr__total-stat--cal  { background: rgba(249, 115, 22, 0.08); }
.sdr__total-stat--pro  { background: rgba(59, 130, 246, 0.08); }
.sdr__total-stat--carb { background: rgba(245, 158, 11, 0.08); }
.sdr__total-stat--fat  { background: rgba(168, 85, 247, 0.08); }

.sdr__total-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.1;
}

.sdr__total-lbl {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ── Add panel ──────────────────────────── */
.sdr__add-panel {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.sdr__add-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.sdr__meal-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.sdr__meal-tab {
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
}

.sdr__meal-tab:hover:not(.sdr__meal-tab--active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sdr__meal-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* ── Calorie banner ─────────────────────── */
.sdr__calorie-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}

.sdr__calorie-banner--ok {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.sdr__calorie-banner--ok .pi {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 1px;
}

.sdr__calorie-banner--warn {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
}

.sdr__calorie-banner--warn .pi {
  color: #ea580c;
  flex-shrink: 0;
  margin-top: 1px;
}

.sdr__calorie-banner--danger {
  background: #fff5f5;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.sdr__calorie-banner--danger .pi {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Add row (button + chip below) ─────── */
.sdr__add-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.sdr__calorie-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.625rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.sdr__calorie-chip--neutral { background: #f5f3f1; color: var(--color-text-secondary); }
.sdr__calorie-chip--ok      { background: #dcfce7; color: #166534; }
.sdr__calorie-chip--warn    { background: #ffedd5; color: #c2410c; }
.sdr__calorie-chip--danger  { background: #fee2e2; color: #991b1b; }

/* ── Past notice ────────────────────────── */
.sdr__past-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 0.875rem;
  font-size: 0.8125rem;
  color: #1e40af;
  line-height: 1.5;
}

/* ── Responsive ─────────────────────────── */
@media (max-width: 720px) {
  .sdr__body {
    grid-template-columns: 1fr;
  }

  .sdr__aside {
    position: static;
  }
}
</style>
