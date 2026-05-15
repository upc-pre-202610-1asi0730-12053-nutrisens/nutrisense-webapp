<!-- PATH: src/app/nutrition-tracking/presentation/views/scan-menu-result.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useNutritionTrackingStore } from '../../application/nutrition-tracking.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'

const { t } = useI18n()
const router    = useRouter()
const toast     = useToast()
const store     = useNutritionTrackingStore()
const iamStore  = useIamStore()
const bodyStore = useBodyHealthMetricsStore()

const { menuScanResult, isViewingToday, dailyCaloriesConsumed } = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''

onMounted(() => {
  if (!menuScanResult.value) {
    router.replace({ name: 'nutrition-log', query: { tab: 'smart-scan' } })
  }
  if (!store.foods.length) store.fetchFoods()
  bodyStore.fetchUserGoal(userId)
})

/** @type {import('vue').Ref<ReturnType<import('../../domain/model/food.entity.js').Food>|null>} */
const pendingFood = ref(null)
const showAddDialog = ref(false)
const addMeal = ref('lunch')

const mealOptions = computed(() => [
  { label: t('meal.breakfast'), value: 'breakfast' },
  { label: t('meal.lunch'),     value: 'lunch'     },
  { label: t('meal.snack'),     value: 'snack'     },
  { label: t('meal.dinner'),    value: 'dinner'    },
])

/**
 * @param {ReturnType<import('../../domain/model/food.entity.js').Food>} food
 */
function openAddDialog(food) {
  pendingFood.value = food
  addMeal.value = 'lunch'
  showAddDialog.value = true
}

/** Adds the pending food to today's log using its serving size, then navigates back. */
function confirmAdd() {
  if (!pendingFood.value) return
  const grams = pendingFood.value.servingSizeG > 0 ? pendingFood.value.servingSizeG : 100
  store.addToLog(userId, pendingFood.value.id, grams, addMeal.value, 'smart-scan')
  toast.add({
    severity: 'success',
    summary: t('scan.addedToLog', { meal: t(`meal.${addMeal.value}`) }),
    life: 2500,
  })
  showAddDialog.value = false
  pendingFood.value = null
  router.push({ name: 'nutrition-log' })
}

/** @param {string} flag */
function translateFlag(flag) {
  const rKey = `restriction.${flag}`
  const translated = t(rKey)
  return translated !== rKey ? translated : t(`condition.${flag}`)
}

/** Clears the current menu scan result and returns to the scan tab. */
function scanAgain() {
  store.resetMenuScan()
  router.push({ name: 'nutrition-log', query: { tab: 'smart-scan' } })
}

const pendingMacros = computed(() =>
  pendingFood.value
    ? pendingFood.value.macrosPerServing()
    : null
)

const calorieGoal = computed(() => bodyStore.userGoal?.dailyCalorieTarget ?? 1911)

const menuItemProjectedPct = computed(() => {
  if (!pendingMacros.value) return 0
  return Math.round(
    (dailyCaloriesConsumed.value + pendingMacros.value.calories) / calorieGoal.value * 100
  )
})

/**
 * @returns {'80'|'110'|'130'|null}
 */
const menuItemBannerLevel = computed(() => {
  if (!isViewingToday.value || !pendingFood.value) return null
  if (menuItemProjectedPct.value >= 130) return '130'
  if (menuItemProjectedPct.value >= 110) return '110'
  if (menuItemProjectedPct.value >= 80)  return '80'
  return null
})

/**
 * Projected calorie % after adding a given food item (one serving).
 * @param {ReturnType<import('../../domain/model/food.entity.js').Food>} food
 * @returns {number}
 */
function itemProjectedPct(food) {
  const macros = food.macrosPerServing()
  return Math.round(
    (dailyCaloriesConsumed.value + macros.calories) / calorieGoal.value * 100
  )
}

/**
 * @param {ReturnType<import('../../domain/model/food.entity.js').Food>} food
 * @returns {'80'|'110'|'130'|null}
 */
function itemBannerLevel(food) {
  if (!isViewingToday.value) return null
  const pct = itemProjectedPct(food)
  if (pct >= 130) return '130'
  if (pct >= 110) return '110'
  if (pct >= 80)  return '80'
  return null
}
</script>

<template>
  <div v-if="menuScanResult" class="smr">

    <!-- Header -->
    <div class="smr__header">
      <div>
        <h1 class="smr__title">{{ t('scan.menuResultTitle') }}</h1>
        <p class="smr__subtitle">{{ t('scan.menuResultSubtitle') }}</p>
      </div>
      <div class="smr__header-actions">
        <button class="smr__action-btn" :aria-label="t('scan.backToScan')" @click="scanAgain">
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
    <div class="smr__status-row">
      <span class="smr__badge">
        <i class="pi pi-check-circle" aria-hidden="true" />
        {{ t('scan.scanComplete') }}
      </span>
      <span class="smr__image-name">
        <i class="pi pi-image" aria-hidden="true" />
        {{ menuScanResult.imageName }}
      </span>
    </div>

    <!-- Section title -->
    <section aria-labelledby="smr-recs-title">
      <h2 id="smr-recs-title" class="smr__section-title">
        <i class="pi pi-star" aria-hidden="true" />
        {{ t('scan.menuRecommendations') }}
      </h2>

      <div class="smr__list">
        <div
          v-for="(item, idx) in menuScanResult.recommendations"
          :key="item.food.id"
          class="smr__item"
          :class="{ 'smr__item--unsafe': !item.isSafe }"
        >
          <!-- Rank -->
          <div class="smr__rank" aria-hidden="true">{{ idx + 1 }}</div>

          <!-- Body -->
          <div class="smr__item-body">
            <div class="smr__item-top">
              <span class="smr__item-name">{{ t(item.food.key) }}</span>
              <span
                class="smr__score"
                :class="item.score >= 7 ? 'smr__score--good' : 'smr__score--avg'"
                :aria-label="`${t('scan.healthScore')}: ${item.score}/10`"
              >
                {{ item.score }}/10
              </span>
            </div>

            <div v-if="item.flags.length" class="smr__flags" role="note">
              <i class="pi pi-exclamation-triangle" aria-hidden="true" />
              {{ item.flags.map(f => translateFlag(f)).join(', ') }}
            </div>

            <div class="smr__macros">
              <span>{{ Math.round(item.food.macrosPerServing().calories) }} kcal</span>
              <span>P {{ Math.round(item.food.macrosPerServing().proteinG * 10) / 10 }}g</span>
              <span>C {{ Math.round(item.food.macrosPerServing().carbsG   * 10) / 10 }}g</span>
              <span>G {{ Math.round(item.food.macrosPerServing().fatG     * 10) / 10 }}g</span>
            </div>

            <div v-if="isViewingToday" class="smr__proj-bar">
              <div class="ns-progress-bar-bg">
                <div
                  class="ns-progress-bar-fill"
                  :style="{
                    width: Math.min(100, itemProjectedPct(item.food)) + '%',
                    background: itemBannerLevel(item.food) === '130'
                      ? 'var(--color-danger)'
                      : itemBannerLevel(item.food) === '110'
                        ? '#f97316'
                        : 'var(--color-primary)',
                  }"
                  role="progressbar"
                  :aria-valuenow="itemProjectedPct(item.food)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="t('scan.calorieStatus', { pct: itemProjectedPct(item.food) })"
                />
              </div>
              <span class="smr__proj-label">{{ t('scan.calorieStatus', { pct: itemProjectedPct(item.food) }) }}</span>
            </div>

            <span
              v-if="isViewingToday && itemBannerLevel(item.food)"
              class="smr__impact-badge"
              :class="{
                'smr__impact-badge--ok':     itemBannerLevel(item.food) === '80',
                'smr__impact-badge--warn':   itemBannerLevel(item.food) === '110',
                'smr__impact-badge--danger': itemBannerLevel(item.food) === '130',
              }"
              :aria-label="t('scan.calorieStatus', { pct: itemProjectedPct(item.food) })"
            >
              <i
                class="pi"
                :class="{
                  'pi-check-circle':         itemBannerLevel(item.food) === '80',
                  'pi-exclamation-triangle': itemBannerLevel(item.food) === '110',
                  'pi-times-circle':         itemBannerLevel(item.food) === '130',
                }"
                aria-hidden="true"
              />
              {{ itemProjectedPct(item.food) }}%
            </span>
          </div>

          <!-- Add button -->
          <pv-button
            v-if="isViewingToday"
            icon="pi pi-plus"
            :label="t('scan.addItemToLog')"
            size="small"
            outlined
            class="smr__add-btn"
            :aria-label="`${t('scan.addItemToLog')}: ${t(item.food.key)}`"
            @click="openAddDialog(item.food)"
          />
        </div>
      </div>
    </section>

    <!-- Add to log dialog -->
    <pv-dialog
      v-model:visible="showAddDialog"
      :header="pendingFood ? t(pendingFood.key) : ''"
      :modal="true"
      :draggable="false"
      style="width: 420px; max-width: 95vw"
    >
      <div v-if="pendingFood && pendingMacros" class="smr__dialog-body">

        <div class="smr__dialog-macros">
          <div class="smr__dmac smr__dmac--cal">
            <span class="smr__dmac-val">{{ Math.round(pendingMacros.calories) }}</span>
            <span class="smr__dmac-lbl">kcal</span>
          </div>
          <div class="smr__dmac smr__dmac--pro">
            <span class="smr__dmac-val">{{ Math.round(pendingMacros.proteinG * 10) / 10 }}g</span>
            <span class="smr__dmac-lbl">{{ t('nutrition.protein') }}</span>
          </div>
          <div class="smr__dmac smr__dmac--carb">
            <span class="smr__dmac-val">{{ Math.round(pendingMacros.carbsG * 10) / 10 }}g</span>
            <span class="smr__dmac-lbl">{{ t('nutrition.carbs') }}</span>
          </div>
          <div class="smr__dmac smr__dmac--fat">
            <span class="smr__dmac-val">{{ Math.round(pendingMacros.fatG * 10) / 10 }}g</span>
            <span class="smr__dmac-lbl">{{ t('nutrition.fat') }}</span>
          </div>
        </div>

        <div
          v-if="menuItemBannerLevel === '80'"
          class="smr__calorie-banner smr__calorie-banner--ok"
          role="status"
          aria-live="polite"
        >
          <i class="pi pi-check-circle" aria-hidden="true" />
          <span>{{ t('scan.menuWillReach80') }}</span>
        </div>
        <div
          v-else-if="menuItemBannerLevel === '110'"
          class="smr__calorie-banner smr__calorie-banner--warn"
          role="status"
          aria-live="polite"
        >
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          <span>{{ t('scan.menuWillExceed110') }}</span>
        </div>
        <div
          v-else-if="menuItemBannerLevel === '130'"
          class="smr__calorie-banner smr__calorie-banner--danger"
          role="alert"
          aria-live="assertive"
        >
          <i class="pi pi-times-circle" aria-hidden="true" />
          <span>{{ t('scan.menuWillExceed130') }}</span>
        </div>

        <div class="smr__dialog-field">
          <span class="smr__dialog-label">{{ t('scan.scanMealType') }}</span>
          <div class="smr__meal-tabs" role="radiogroup" :aria-label="t('scan.selectMealType')">
            <button
              v-for="opt in mealOptions"
              :key="opt.value"
              class="smr__meal-tab"
              :class="{ 'smr__meal-tab--active': addMeal === opt.value }"
              role="radio"
              :aria-checked="addMeal === opt.value"
              @click="addMeal = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

      </div>

      <template #footer>
        <pv-button :label="t('common.cancel')" severity="secondary" text @click="showAddDialog = false" />
        <pv-button icon="pi pi-plus" :label="t('nutrition.confirm')" @click="confirmAdd" />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.smr {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 100%;
}

/* ── Header ─────────────────────────────── */
.smr__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.smr__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.125rem;
}

.smr__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.smr__header-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.smr__action-btn {
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

.smr__action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── Status row ─────────────────────────── */
.smr__status-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-wrap: wrap;
}

.smr__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  background: #ede9fe;
  color: #4c1d95;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 700;
}

.smr__image-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

/* ── Section title ──────────────────────── */
.smr__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.875rem;
}

/* ── List ───────────────────────────────── */
.smr__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.smr__item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #fff;
  border: 1px solid var(--color-border);
  border-left: 3px solid #8b5cf6;
  border-radius: 12px;
  transition: box-shadow 0.12s;
}

.smr__item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.smr__item--unsafe {
  border-left-color: #f59e0b;
  background: #fffbf0;
}

/* ── Rank ───────────────────────────────── */
.smr__rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ede9fe;
  color: #4c1d95;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
}

.smr__item--unsafe .smr__rank {
  background: #fef3c7;
  color: #92400e;
}

/* ── Item body ──────────────────────────── */
.smr__item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.smr__item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.smr__item-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Score ──────────────────────────────── */
.smr__score {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
}

.smr__score--good { background: #d1fae5; color: #065f46; }
.smr__score--avg  { background: #fef3c7; color: #92400e; }

/* ── Flags ──────────────────────────────── */
.smr__flags {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #b45309;
  font-weight: 500;
}

/* ── Macros ─────────────────────────────── */
.smr__macros {
  display: flex;
  gap: 0.625rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

/* ── Add button ─────────────────────────── */
.smr__add-btn {
  flex-shrink: 0;
}

/* ── Dialog ─────────────────────────────── */
.smr__dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.smr__dialog-macros {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.smr__dmac {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-radius: 10px;
  gap: 0.125rem;
  text-align: center;
}

.smr__dmac--cal  { background: rgba(249, 115, 22, 0.08); }
.smr__dmac--pro  { background: rgba(59, 130, 246, 0.08); }
.smr__dmac--carb { background: rgba(245, 158, 11, 0.08); }
.smr__dmac--fat  { background: rgba(168, 85, 247, 0.08); }

.smr__dmac-val {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.1;
}

.smr__dmac-lbl {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.smr__dialog-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.smr__dialog-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.smr__meal-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.smr__meal-tab {
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

.smr__meal-tab:hover:not(.smr__meal-tab--active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.smr__meal-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* ── Calorie banner ─────────────────────── */
.smr__calorie-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}

.smr__calorie-banner--ok {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.smr__calorie-banner--ok .pi {
  color: #16a34a;
  flex-shrink: 0;
  margin-top: 1px;
}

.smr__calorie-banner--warn {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
}

.smr__calorie-banner--warn .pi {
  color: #ea580c;
  flex-shrink: 0;
  margin-top: 1px;
}

.smr__calorie-banner--danger {
  background: #fff5f5;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.smr__calorie-banner--danger .pi {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Projected progress bar (per recommendation card) ── */
.smr__proj-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.smr__proj-label {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ── Impact badge (per recommendation card) ── */
.smr__impact-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  width: fit-content;
}

.smr__impact-badge--ok     { background: #dcfce7; color: #166534; }
.smr__impact-badge--warn   { background: #ffedd5; color: #c2410c; }
.smr__impact-badge--danger { background: #fee2e2; color: #991b1b; }

/* ── Responsive ─────────────────────────── */
@media (max-width: 640px) {
  .smr__item {
    flex-wrap: wrap;
  }

  .smr__add-btn {
    width: 100%;
  }

  .smr__dialog-macros {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>