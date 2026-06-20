<!-- PATH: src/app/analytics-reporting/presentation/views/analytics.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { Chart } from 'chart.js/auto'
import { useAnalyticsReportingStore } from '../../application/analytics-reporting.store.js'
import { useNutritionTrackingStore } from '../../../nutrition-tracking/application/nutrition-tracking.store.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import { toLocalDateString } from '../../../shared/infrastructure/date-utils.js'

const { t, locale } = useI18n()
const toast = useToast()
const analyticsStore = useAnalyticsReportingStore()
const nutritionStore = useNutritionTrackingStore()
const bodyStore = useBodyHealthMetricsStore()
const billingStore = useSubscriptionsBillingStore()

const { selectedRange, dateRange, weeklyCompletionPercent, errors, streakLoaded } = toRefs(analyticsStore)
const { logsLoaded } = toRefs(nutritionStore)

const currentTier = computed(() => billingStore.currentTier)

const userId = localStorage.getItem('ns_user_id') ?? ''

const showCustomModal = ref(false)
const showExportModal = ref(false)
const isExporting = ref(false)
const draftStart = ref(null)
const draftEnd = ref(null)
/** @type {import('vue').Ref<'7d'|'30d'|'90d'|'custom'>} */
const previousRange = ref('7d')
const exportSections = ref({
  kpis: true,
  calories: true,
  macros: true,
  weight: true,
  streak: true,
})

const calorieCanvasRef = ref(null)
let calorieChart = null

/**
 * Range options with disabled state derived from the user's plan tier.
 * basic → 7d only; pro → 7d + 30d; premium → all.
 */
const rangeOptions = computed(() => {
  const tier = currentTier.value
  const atLeastPro     = tier?.isAtLeast('pro')     ?? false
  const atLeastPremium = tier?.isAtLeast('premium') ?? false
  return [
    { label: '7d',                  value: '7d'     },
    { label: '30d',                 value: '30d',    disabled: !atLeastPro     },
    { label: '90d',                 value: '90d',    disabled: !atLeastPremium },
    { label: t('analytics.custom'), value: 'custom', disabled: !atLeastPremium },
  ]
})

const logsInRange = computed(() =>
  nutritionStore.getLogsForDateRange(dateRange.value.start, dateRange.value.end)
)

const weightLogsInRange = computed(() => {
  const { start, end } = dateRange.value
  return bodyStore.weightLogs.filter(l => {
    const d = new Date(l.loggedAt)
    return d >= start && d <= end
  })
})

const kpis = computed(() => {
  const nutritionEntries = logsInRange.value.map(l => {
    const m = l.macros()
    return { calories: m.calories, proteinG: m.proteinG }
  })
  const weightEntries = weightLogsInRange.value.map(l => ({ loggedAt: l.loggedAt, weightKg: l.weightKg }))
  return analyticsStore.calculateKpis(nutritionEntries, weightEntries)
})

const adherence = computed(() => analyticsStore.calculateAdherence())

const isLoading = computed(() => !logsLoaded.value)

const macroTotals = computed(() => {
  if (!logsInRange.value.length) return { protein: 0, carbs: 0, fat: 0, fiber: 0 }
  return {
    protein: Math.round(logsInRange.value.reduce((s, l) => s + l.macros().proteinG, 0)),
    carbs:   Math.round(logsInRange.value.reduce((s, l) => s + l.macros().carbsG,   0)),
    fat:     Math.round(logsInRange.value.reduce((s, l) => s + l.macros().fatG,     0)),
    fiber:   Math.round(logsInRange.value.reduce((s, l) => s + l.macros().fiberG,   0)),
  }
})

const macroTotal = computed(() =>
  macroTotals.value.protein + macroTotals.value.carbs + macroTotals.value.fat + macroTotals.value.fiber || 1
)

onMounted(() => {
  analyticsStore.refreshDateRange()
  if (userId) {
    nutritionStore.fetchLogs(userId)
    bodyStore.fetchWeightLogs(userId)
    analyticsStore.fetchStreak(userId)
    analyticsStore.fetchDashboard(userId, toLocalDateString(new Date()))
    analyticsStore.fetchProgress(
      userId,
      toLocalDateString(dateRange.value.start),
      toLocalDateString(dateRange.value.end),
    )
    if (!billingStore.subscriptionLoaded) billingStore.fetchSubscription(userId)
    if (!billingStore.plansLoaded)        billingStore.fetchPlans()
  }
})

watch(dateRange, (range) => {
  if (userId) {
    analyticsStore.fetchProgress(
      userId,
      toLocalDateString(range.start),
      toLocalDateString(range.end),
    )
  }
})

onBeforeUnmount(() => {
  calorieChart?.destroy()
})

/** Destroys any existing calorie chart and rebuilds a bar chart from logs in the current date range. */
function buildCalorieChart() {
  if (!calorieCanvasRef.value) return
  calorieChart?.destroy()

  const byDate = new Map()
  for (const l of logsInRange.value) {
    const day = l.date
    byDate.set(day, (byDate.get(day) ?? 0) + l.macros().calories)
  }
  const days = [...byDate.keys()].sort()
  const labels = days.map(d => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
  const data = days.map(d => Math.round(byDate.get(d)))

  calorieChart = new Chart(calorieCanvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: t('analytics.calorieHistory'),
        data,
        backgroundColor: 'rgba(80,139,137,0.75)',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.y} kcal` },
        },
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: 'Poppins', size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Poppins', size: 11 }, maxRotation: 0, maxTicksLimit: 10 },
        },
      },
    },
  })
}

watch(logsInRange, () => {
  if (logsInRange.value.length) buildCalorieChart()
}, { flush: 'post' })

/**
 * @param {'7d'|'30d'|'90d'|'custom'} val
 */
function handleRangeChange(val) {
  if (val === 'custom') {
    previousRange.value = selectedRange.value
    draftStart.value = analyticsStore.customStartDate ? toLocalDateString(analyticsStore.customStartDate) : null
    draftEnd.value = analyticsStore.customEndDate ? toLocalDateString(analyticsStore.customEndDate) : null
    analyticsStore.setRange('custom')
    showCustomModal.value = true
  } else {
    analyticsStore.setRange(val)
  }
}

/** @type {import('vue').ComputedRef<boolean>} */
const isApplyDisabled = computed(() => {
  if (!draftStart.value || !draftEnd.value) return true
  return new Date(draftEnd.value) < new Date(draftStart.value)
})

/** Applies the custom date range from the draft inputs and closes the modal. */
function handleApplyCustomRange() {
  analyticsStore.setCustomRange(
    new Date(draftStart.value + 'T00:00:00'),
    new Date(draftEnd.value + 'T00:00:00'),
  )
  showCustomModal.value = false
}

/** Reverts the selected range to the value before the custom modal was opened and closes it. */
function handleCancelCustomRange() {
  analyticsStore.setRange(previousRange.value)
  showCustomModal.value = false
}

watch(currentTier, tier => {
  const range = selectedRange.value
  const atLeastPro     = tier?.isAtLeast('pro')     ?? false
  const atLeastPremium = tier?.isAtLeast('premium') ?? false
  if ((range === '90d' || range === 'custom') && !atLeastPremium) {
    analyticsStore.setRange('7d')
  } else if (range === '30d' && !atLeastPro) {
    analyticsStore.setRange('7d')
  }
})

/** Human-readable label for the currently selected range, used in the PDF header. */
const rangeLabel = computed(() => {
  const r = selectedRange.value
  return r === 'custom' ? t('analytics.custom') : t(`analytics.${r}`)
})

/**
 * Generates and downloads a PDF report of the selected sections.
 * Chart images are captured from the live chart.js canvas; all other data
 * is read from the already-computed view state and handed to the service.
 */
async function handleExportPdf() {
  isExporting.value = true
  try {
    const { generateAnalyticsPdf } = await import('../../infrastructure/pdf-export.service.js')
    const calorieChartImage = exportSections.value.calories
      ? (calorieChart?.toBase64Image('image/png', 1) ?? null)
      : null

    generateAnalyticsPdf({
      sections: { ...exportSections.value },
      data: {
        kpis: kpis.value,
        macroTotals: macroTotals.value,
        adherence: adherence.value,
        weeklyCompletion: weeklyCompletionPercent.value,
        weightLogs: weightLogsInRange.value.map(l => ({ loggedAt: l.loggedAt, weightKg: l.weightKg })),
      },
      calorieChartImage,
      range: { start: dateRange.value.start, end: dateRange.value.end, label: rangeLabel.value },
      t,
      locale: locale.value,
    })

    showExportModal.value = false
    toast.add({ severity: 'success', summary: t('analytics.exportSuccess'), life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: t('analytics.exportError'), life: 3000 })
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="analytics-view">

    <!-- Header -->
    <div class="analytics-header">
      <div class="analytics-header__left">
        <h1 class="analytics-title">{{ t('analytics.title') }}</h1>
      </div>
      <div class="analytics-header__right">
        <!-- Range tabs -->
        <ns-tabs :model-value="selectedRange" :tabs="rangeOptions" size="sm" @update:model-value="handleRangeChange" />
        <!-- Export button — Premium only -->
        <pv-button
          v-if="currentTier?.isAtLeast('premium')"
          icon="pi pi-download"
          :label="t('analytics.exportPdf')"
          outlined
          size="small"
          :aria-label="t('analytics.exportPdf')"
          @click="showExportModal = true"
        />
      </div>
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <!-- KPI cards -->
    <div class="analytics-kpis">
      <div class="ns-panel analytics-kpi">
        <div class="analytics-kpi__icon" style="background:rgba(80,139,137,0.12);color:var(--color-primary)">
          <i class="pi pi-bolt" aria-hidden="true" />
        </div>
        <div class="analytics-kpi__body">
          <pv-skeleton v-if="isLoading" height="1.5rem" width="4rem" />
          <div v-else class="analytics-kpi__value">{{ kpis.avgKcal }}<span class="analytics-kpi__unit">kcal</span></div>
          <div class="analytics-kpi__label">{{ t('analytics.avgCalories') }}</div>
        </div>
      </div>

      <div class="ns-panel analytics-kpi">
        <div class="analytics-kpi__icon" style="background:rgba(76,175,80,0.12);color:#4caf50">
          <i class="pi pi-chart-bar" aria-hidden="true" />
        </div>
        <div class="analytics-kpi__body">
          <pv-skeleton v-if="isLoading" height="1.5rem" width="4rem" />
          <div v-else class="analytics-kpi__value">{{ kpis.avgProtein }}<span class="analytics-kpi__unit">g</span></div>
          <div class="analytics-kpi__label">{{ t('analytics.avgProtein') }}</div>
        </div>
      </div>

      <div class="ns-panel analytics-kpi">
        <div class="analytics-kpi__icon" style="background:rgba(59,130,246,0.12);color:#3b82f6">
          <i class="pi pi-chart-line" aria-hidden="true" />
        </div>
        <div class="analytics-kpi__body">
          <pv-skeleton v-if="isLoading" height="1.5rem" width="4rem" />
          <div v-else class="analytics-kpi__value">
            <span v-if="kpis.weightChange > 0">+</span>{{ kpis.weightChange }}<span class="analytics-kpi__unit">kg</span>
          </div>
          <div class="analytics-kpi__label">{{ t('analytics.weightChange') }}</div>
        </div>
      </div>

      <div class="ns-panel analytics-kpi">
        <div class="analytics-kpi__icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">
          <i class="pi pi-star-fill" aria-hidden="true" />
        </div>
        <div class="analytics-kpi__body">
          <pv-skeleton v-if="!streakLoaded" height="1.5rem" width="4rem" />
          <div v-else class="analytics-kpi__value">{{ kpis.currentStreak }}<span class="analytics-kpi__unit">{{ t('analytics.days') }}</span></div>
          <div class="analytics-kpi__label">{{ t('analytics.currentStreak') }}</div>
        </div>
      </div>

      <div class="ns-panel analytics-kpi">
        <div class="analytics-kpi__icon" style="background:rgba(139,92,246,0.12);color:#8b5cf6">
          <i class="pi pi-check-circle" aria-hidden="true" />
        </div>
        <div class="analytics-kpi__body">
          <pv-skeleton v-if="!streakLoaded" height="1.5rem" width="4rem" />
          <div v-else class="analytics-kpi__value">{{ weeklyCompletionPercent }}<span class="analytics-kpi__unit">%</span></div>
          <div class="analytics-kpi__label">{{ t('analytics.weeklyCompletion') }}</div>
        </div>
      </div>
    </div>

    <!-- No data state -->
    <div v-if="!isLoading && !logsInRange.length" class="analytics-empty">
      <i class="pi pi-chart-bar" aria-hidden="true" />
      <p>{{ t('analytics.noData') }}</p>
    </div>

    <!-- Charts row -->
    <div v-else-if="!isLoading" class="analytics-charts">

      <!-- Calorie history bar chart -->
      <div class="ns-panel analytics-chart-panel">
        <div class="ns-panel__header">
          <span class="ns-panel__title">{{ t('analytics.calorieHistory') }}</span>
        </div>
        <div class="analytics-chart-wrap">
          <canvas ref="calorieCanvasRef" :aria-label="t('analytics.calorieHistoryChartLabel')" />
        </div>
      </div>

      <!-- Macro breakdown + streak -->
      <div class="analytics-side">

        <!-- Macro breakdown -->
        <div class="ns-panel">
          <div class="ns-panel__header">
            <span class="ns-panel__title">{{ t('analytics.macroBreakdown') }}</span>
          </div>
          <div class="macro-bars">
            <div class="macro-bar-item">
              <div class="macro-bar-label">
                <span>{{ t('analytics.avgProtein') }}</span>
                <strong>{{ macroTotals.protein }}g</strong>
              </div>
              <div class="ns-progress-bar-bg">
                <div class="ns-progress-bar-fill fill-protein" :style="{ width: Math.round(macroTotals.protein / macroTotal * 100) + '%' }" />
              </div>
            </div>
            <div class="macro-bar-item">
              <div class="macro-bar-label">
                <span>{{ t('dashboard.carbs') }}</span>
                <strong>{{ macroTotals.carbs }}g</strong>
              </div>
              <div class="ns-progress-bar-bg">
                <div class="ns-progress-bar-fill fill-carbs" :style="{ width: Math.round(macroTotals.carbs / macroTotal * 100) + '%' }" />
              </div>
            </div>
            <div class="macro-bar-item">
              <div class="macro-bar-label">
                <span>{{ t('dashboard.fat') }}</span>
                <strong>{{ macroTotals.fat }}g</strong>
              </div>
              <div class="ns-progress-bar-bg">
                <div class="ns-progress-bar-fill fill-fat" :style="{ width: Math.round(macroTotals.fat / macroTotal * 100) + '%' }" />
              </div>
            </div>
            <div class="macro-bar-item">
              <div class="macro-bar-label">
                <span>{{ t('dashboard.fiber') }}</span>
                <strong>{{ macroTotals.fiber }}g</strong>
              </div>
              <div class="ns-progress-bar-bg">
                <div class="ns-progress-bar-fill fill-fiber" :style="{ width: Math.round(macroTotals.fiber / macroTotal * 100) + '%' }" />
              </div>
            </div>
          </div>
        </div>

        <!-- Streak & adherence -->
        <div class="ns-panel">
          <div class="ns-panel__header">
            <span class="ns-panel__title">{{ t('analytics.streakSection') }}</span>
          </div>
          <div class="streak-stat">
            <span class="streak-stat__icon"><i class="pi pi-bolt" aria-hidden="true" /></span>
            <div>
              <div class="streak-stat__val">{{ kpis.currentStreak }} <span class="streak-stat__unit">{{ t('analytics.days') }}</span></div>
              <div class="streak-stat__lbl">{{ t('analytics.currentStreak') }}</div>
            </div>
          </div>
          <div style="margin-top:1rem">
            <div class="macro-bar-label" style="margin-bottom:0.375rem">
              <span>{{ t('analytics.adherence') }}</span>
              <strong>{{ adherence }}%</strong>
            </div>
            <div class="ns-progress-bar-bg">
              <div class="ns-progress-bar-fill fill-primary" :style="{ width: adherence + '%' }" />
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Custom range modal -->
    <pv-dialog
      :visible="showCustomModal"
      :header="t('analytics.customRangeTitle')"
      :modal="true"
      :draggable="false"
      style="width:380px;max-width:95vw"
      @update:visible="val => !val && handleCancelCustomRange()"
    >
      <div class="custom-range-modal">
        <div class="custom-range-modal__field">
          <label for="modal-range-start" class="custom-range-modal__label">
            {{ t('analytics.startDate') }}
          </label>
          <pv-input-text
            id="modal-range-start"
            v-model="draftStart"
            type="date"
            class="custom-range-modal__input"
            :aria-label="t('analytics.startDate')"
          />
        </div>
        <div class="custom-range-modal__field">
          <label for="modal-range-end" class="custom-range-modal__label">
            {{ t('analytics.endDate') }}
          </label>
          <pv-input-text
            id="modal-range-end"
            v-model="draftEnd"
            type="date"
            class="custom-range-modal__input"
            :aria-label="t('analytics.endDate')"
          />
        </div>
        <p v-if="draftStart && draftEnd && isApplyDisabled" class="custom-range-modal__error" role="alert">
          <i class="pi pi-exclamation-circle" aria-hidden="true" />
          {{ t('analytics.invalidRange') }}
        </p>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" text @click="handleCancelCustomRange" />
        <pv-button
          :label="t('analytics.apply')"
          :disabled="isApplyDisabled"
          @click="handleApplyCustomRange"
        />
      </template>
    </pv-dialog>

    <!-- Export PDF modal -->
    <pv-dialog
      :visible="showExportModal"
      :header="t('analytics.exportTitle')"
      :modal="true"
      :draggable="false"
      style="width:420px;max-width:95vw"
      @update:visible="val => !val && (showExportModal = false)"
    >
      <div class="export-modal">
        <p class="export-modal__subtitle">{{ t('analytics.sections') }}</p>
        <div class="export-sections">
          <label v-for="(val, key) in exportSections" :key="key" class="export-section-item">
            <input
              v-model="exportSections[key]"
              type="checkbox"
              class="export-section-check"
              :aria-label="t(`analytics.section${key.charAt(0).toUpperCase() + key.slice(1)}`)"
            />
            <span class="export-section-label">
              {{ t(`analytics.section${key.charAt(0).toUpperCase() + key.slice(1)}`) }}
            </span>
          </label>
        </div>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" text :disabled="isExporting" @click="showExportModal = false" />
        <pv-button
          icon="pi pi-download"
          :label="t('analytics.generate')"
          :loading="isExporting"
          :disabled="isExporting || !Object.values(exportSections).some(Boolean)"
          @click="handleExportPdf"
        />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.analytics-view {
  max-width: 100%;
}

.ns-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #edeae7;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
  padding: 1.25rem;
}

/* Header */
.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.analytics-header__left { display: flex; align-items: center; gap: 1rem; }
.analytics-header__right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

.analytics-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

/* KPI cards */
.analytics-kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}

.analytics-kpi {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem;
}

.analytics-kpi__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.analytics-kpi__value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.analytics-kpi__unit {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 0.2rem;
}

.analytics-kpi__label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

/* Charts layout */
.analytics-charts {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1rem;
}

.analytics-chart-panel {
  display: flex;
  flex-direction: column;
}

.analytics-chart-wrap {
  position: relative;
  flex: 1;
  min-height: 200px;
  width: 100%;
}

.analytics-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Macro bars */
.macro-bars {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.macro-bar-item { display: flex; flex-direction: column; gap: 0.3rem; }

.macro-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.macro-bar-label strong { color: var(--color-text); font-weight: 600; }

/* Streak stat */
.streak-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.streak-stat__icon { font-size: 1.5rem; line-height: 1; color: #f59e0b; }

.streak-stat__val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.streak-stat__unit { font-size: 0.875rem; color: var(--color-text-secondary); font-weight: 500; }
.streak-stat__lbl { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.1rem; }

/* Empty state */
.analytics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.analytics-empty i { font-size: 2.5rem; color: var(--color-border); }

/* Custom range modal */
.custom-range-modal {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding: 0.25rem 0;
}

.custom-range-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.custom-range-modal__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.custom-range-modal__input {
  width: 100%;
}

.custom-range-modal__error {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-danger, #ef4444);
  margin: 0;
}

/* Export modal */
.export-modal__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.export-sections {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.export-section-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
}

.export-section-check {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.export-section-label {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

@media (max-width: 900px) {
  .analytics-kpis { grid-template-columns: repeat(3, 1fr); }
  .analytics-charts { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .analytics-kpis { grid-template-columns: repeat(2, 1fr); }
  .analytics-header { flex-direction: column; align-items: flex-start; }
}
</style>
