<!-- PATH: src/app/analytics-reporting/presentation/views/dashboard.view.vue -->
<script setup>
import { onMounted, onBeforeUnmount, computed, toRefs, ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useNutritionTrackingStore } from '../../../nutrition-tracking/application/nutrition-tracking.store.js'
import { useAnalyticsReportingStore } from '../../application/analytics-reporting.store.js'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'
import { useActivityWearableStore } from '../../../activity-wearable/application/activity-wearable.store.js'

const { t, locale } = useI18n()
const router = useRouter()

const iamStore       = useIamStore()
const nutritionStore = useNutritionTrackingStore()
const analyticsStore = useAnalyticsReportingStore()
const bodyStore      = useBodyHealthMetricsStore()
const activityStore  = useActivityWearableStore()

const { currentUser }                                                    = toRefs(iamStore)
const { dailyCaloriesConsumed, dailyMacros, logsByMealType, logsLoaded } = toRefs(nutritionStore)
const { streak, streakAtRisk, weeklyCompletionPercent }                  = toRefs(analyticsStore)
const { todayCaloriesBurned }                                            = toRefs(activityStore)

const userId = localStorage.getItem('ns_user_id') ?? ''

const chartRef      = ref(null)
let   chartInstance = null

onMounted(async () => {
  if (!userId) return
  nutritionStore.fetchLogs(userId)
  nutritionStore.fetchFoods()
  analyticsStore.fetchStreak(userId)
  bodyStore.fetchUserGoal(userId)
  activityStore.fetchActivityLogs(userId)
  await nextTick()
  buildChart()
})

onBeforeUnmount(() => { chartInstance?.destroy() })

const isMusclGain = computed(() => currentUser.value?.goal?.value === 'muscle-gain')
const calorieGoal = computed(() => bodyStore.userGoal?.dailyCalorieTarget ?? 1911)
const proteinGoal = computed(() => bodyStore.userGoal?.macroTargets?.proteinG ?? 112)
const carbsGoal   = computed(() => bodyStore.userGoal?.macroTargets?.carbsG   ?? 247)
const fatGoal     = computed(() => bodyStore.userGoal?.macroTargets?.fatG     ?? 53)
const fiberGoal   = computed(() => bodyStore.userGoal?.macroTargets?.fiberG   ?? 25)

const greeting = computed(() => {
  const h    = new Date().getHours()
  const name = currentUser.value?.firstName ?? ''
  if (h < 12) return t('dashboard.goodMorning',   { name })
  if (h < 18) return t('dashboard.goodAfternoon', { name })
  return t('dashboard.goodEvening', { name })
})

const bcp47 = computed(() => locale.value === 'es' ? 'es-ES' : 'en-US')

const formattedDate = computed(() =>
  new Date().toLocaleDateString(bcp47.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)

const streakBroken = computed(() => (streak.value?.currentStreak ?? 0) === 0)
const streakCount  = computed(() => streak.value?.currentStreak ?? 0)
const weekDays     = computed(() => streak.value?.weeklyCompletionDays ?? Array(7).fill(false))

/**
 * Single-character weekday labels (Mon–Sun) in the active locale.
 * Uses Intl so they switch language automatically on locale change.
 * @type {import('vue').ComputedRef<string[]>}
 */
const dayLabels = computed(() => {
  const fmt    = new Intl.DateTimeFormat(bcp47.value, { weekday: 'narrow' })
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return fmt.format(d)
  })
})

const todayIndex = computed(() => (new Date().getDay() + 6) % 7)

const caloriesRemaining = computed(() =>
  Math.max(0, calorieGoal.value - dailyCaloriesConsumed.value + todayCaloriesBurned.value)
)
const netBalance = computed(() => dailyCaloriesConsumed.value - todayCaloriesBurned.value)

function pct(val, goal) { return goal > 0 ? Math.min(100, Math.round(val / goal * 100)) : 0 }
const proteinPct = computed(() => pct(dailyMacros.value?.proteinG ?? 0, proteinGoal.value))
const carbsPct   = computed(() => pct(dailyMacros.value?.carbsG   ?? 0, carbsGoal.value))
const fatPct     = computed(() => pct(dailyMacros.value?.fatG     ?? 0, fatGoal.value))

const donutValues = computed(() => [
  dailyMacros.value?.proteinG ?? 0,
  dailyMacros.value?.carbsG   ?? 0,
  dailyMacros.value?.fatG     ?? 0,
])

watch(donutValues, vals => {
  if (!chartInstance) return
  chartInstance.data.datasets[0].data = vals
  chartInstance.update()
})

function buildChart() {
  if (!chartRef.value) return
  chartInstance = new Chart(chartRef.value, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: donutValues.value,
        backgroundColor: ['#508b89', '#F4C5AE', '#f472b6'],
        borderWidth: 0,
        borderRadius: 3,
        hoverOffset: 0,
      }],
    },
    options: {
      cutout: '74%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation:  { duration: 600, easing: 'easeOutQuart' },
    },
  })
}

const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

const mealConfig = {
  breakfast: { labelKey: 'meal.breakfast', color: '#f59e0b' },
  lunch:     { labelKey: 'meal.lunch',     color: '#508b89' },
  snack:     { labelKey: 'meal.snack',     color: '#a855f7' },
  dinner:    { labelKey: 'meal.dinner',    color: '#9ca3af' },
}

function mealKcal(meal) {
  const logs = logsByMealType.value?.[meal] ?? []
  if (!logs.length) return null
  return logs.reduce((s, l) => { try { return s + (l.macros?.().calories ?? 0) } catch { return s } }, 0)
}

function mealFirstFood(meal) {
  const logs = logsByMealType.value?.[meal] ?? []
  if (!logs.length) return null
  const log = logs[0]
  try { return log.foodKey ? t(log.foodKey) : (log.name ?? null) } catch { return log.name ?? null }
}

function goToLog(meal) {
  router.push({ name: 'nutrition-log', query: meal ? { meal } : {} })
}
</script>

<template>
  <div class="dash">

    <!-- Greeting -->
    <div class="dash__greeting">
      <div>
        <h1 class="dash__name">{{ greeting }}</h1>
        <p class="dash__date">{{ formattedDate }}</p>
      </div>
      <span class="status-pill status-pill--ok">
        <i :class="['pi', streakBroken ? 'pi-flag' : 'pi-check']" aria-hidden="true" />
        {{ streakBroken ? t('streak.start_fresh') : t('dashboard.onTrack', { n: streakCount }) }}
      </span>
    </div>

    <!-- Alert banner (streak at risk) -->
    <div v-if="streakAtRisk && !streakBroken" class="ns-banner ns-banner--warning" role="alert">
      <i class="pi pi-exclamation-triangle" style="color:#d97706;flex-shrink:0" aria-hidden="true" />
      <div style="flex:1">
        <strong style="font-size:0.875rem;display:block">{{ t('streak.keep_going') }}</strong>
        <p style="font-size:0.8125rem;color:var(--color-text-secondary);margin-top:2px">{{ t('dashboard.streakAtRiskBody') }}</p>
      </div>
      <button class="outlined-btn" @click="goToLog()">{{ t('nutrition.addFood') }}</button>
    </div>

    <!-- KPI cards -->
    <div class="dash__kpis">
      <div class="kpi">
        <div class="kpi__label-row">
          <span class="kpi__label">{{ t('dashboard.caloriesConsumed').toUpperCase() }}</span>
          <button
            class="kpi__info-btn"
            v-tooltip.top="t('dashboard.kpiInfo.caloriesConsumed')"
            :aria-label="t('dashboard.kpiInfo.caloriesConsumed')"
            type="button"
          ><i class="pi pi-info-circle" aria-hidden="true" /></button>
        </div>
        <div class="kpi__value">{{ dailyCaloriesConsumed }}</div>
        <div class="kpi__sub">{{ t('dashboard.caloriesOf', { n: calorieGoal }) }}</div>
        <div class="kpi__bar">
          <div class="kpi__bar-fill" :style="{ width: pct(dailyCaloriesConsumed, calorieGoal) + '%', background: 'var(--color-primary)' }" />
        </div>
      </div>

      <div class="kpi">
        <div class="kpi__label-row">
          <span class="kpi__label">{{ t('dashboard.caloriesRemaining').toUpperCase() }}</span>
          <button
            class="kpi__info-btn"
            v-tooltip.top="t('dashboard.kpiInfo.caloriesRemaining')"
            :aria-label="t('dashboard.kpiInfo.caloriesRemaining')"
            type="button"
          ><i class="pi pi-info-circle" aria-hidden="true" /></button>
        </div>
        <div class="kpi__value kpi__value--teal">{{ caloriesRemaining }}</div>
        <div class="kpi__sub">{{ t('dashboard.kcalAvailable') }}</div>
        <div class="kpi__bar">
          <div class="kpi__bar-fill" :style="{ width: pct(caloriesRemaining, calorieGoal) + '%', background: '#e5e7eb' }" />
        </div>
      </div>

      <div class="kpi">
        <div class="kpi__label-row">
          <span class="kpi__label">{{ t('dashboard.caloriesBurned').toUpperCase() }}</span>
          <button
            class="kpi__info-btn"
            v-tooltip.top="t('dashboard.kpiInfo.caloriesBurned')"
            :aria-label="t('dashboard.kpiInfo.caloriesBurned')"
            type="button"
          ><i class="pi pi-info-circle" aria-hidden="true" /></button>
        </div>
        <div class="kpi__value kpi__value--burned">{{ todayCaloriesBurned }}</div>
        <div class="kpi__sub">{{ t('activity.caloriesBurned') }}</div>
        <div class="kpi__bar">
          <div class="kpi__bar-fill" :style="{ width: pct(todayCaloriesBurned, calorieGoal) + '%', background: '#10b981' }" />
        </div>
      </div>

      <div class="kpi">
        <div class="kpi__label-row">
          <span class="kpi__label">{{ t('dashboard.netBalance').toUpperCase() }}</span>
          <button
            class="kpi__info-btn"
            v-tooltip.top="t('dashboard.kpiInfo.netBalance')"
            :aria-label="t('dashboard.kpiInfo.netBalance')"
            type="button"
          ><i class="pi pi-info-circle" aria-hidden="true" /></button>
        </div>
        <div
          class="kpi__value"
          :class="netBalance > calorieGoal ? 'kpi__value--over' : netBalance < 0 ? 'kpi__value--teal' : ''"
        >{{ netBalance }}</div>
        <div class="kpi__sub">{{ t('dashboard.kcalNet') }}</div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="dash__grid">

      <!-- Today's log -->
      <div class="ns-panel">
        <div class="ns-panel__header">
          <span class="panel-title-lg">{{ t('dashboard.todayLog') }}</span>
          <button class="outlined-btn" @click="goToLog()">{{ t('dashboard.viewLog') }}</button>
        </div>

        <div v-if="!logsLoaded" class="meal-rows">
          <pv-skeleton v-for="i in 4" :key="i" height="52px" border-radius="8px" style="margin-bottom:6px" />
        </div>

        <div v-else class="meal-rows">
          <div
            v-for="type in mealTypes"
            :key="type"
            class="meal-row"
            role="button"
            tabindex="0"
            :aria-label="t(mealConfig[type].labelKey)"
            @click="goToLog(type)"
            @keydown.enter="goToLog(type)"
          >
            <span class="meal-dot" :style="{ background: mealConfig[type].color }" />
            <div class="meal-row__body">
              <span class="meal-row__name">{{ t(mealConfig[type].labelKey) }}</span>
              <span v-if="mealFirstFood(type)" class="meal-row__sub">{{ mealFirstFood(type) }}</span>
              <span v-else class="meal-row__sub meal-row__sub--empty">{{ t('dashboard.mealNotLogged') }}</span>
            </div>
            <span class="meal-row__kcal" :class="{ 'meal-row__kcal--logged': mealKcal(type) !== null }">
              {{ mealKcal(type) !== null ? mealKcal(type) + ' ' + t('macros.kcal') : '— ' + t('macros.kcal') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Daily macros -->
      <div class="ns-panel">
        <div class="ns-panel__header" style="margin-bottom:0.75rem">
          <span class="panel-title-lg">{{ t('dashboard.dailyMacros') }}</span>
          <button
            class="kpi__info-btn"
            v-tooltip.top="t('dashboard.kpiInfo.dailyMacros')"
            :aria-label="t('dashboard.kpiInfo.dailyMacros')"
            type="button"
          ><i class="pi pi-info-circle" aria-hidden="true" /></button>
        </div>

        <div class="donut-wrap">
          <canvas ref="chartRef" width="160" height="160" />
          <div class="donut-center">
            <div class="donut-center__val">{{ dailyCaloriesConsumed }}</div>
            <div class="donut-center__lbl">{{ t('macros.kcal') }}</div>
          </div>
        </div>

        <div class="macro-rows">
          <div class="macro-row">
            <span class="macro-dot" style="background:#508b89" />
            <span class="macro-lbl">{{ t('dashboard.protein') }}</span>
            <div class="macro-bar-wrap">
              <div class="ns-progress-bar-bg"><div class="ns-progress-bar-fill fill-protein" :style="{ width: proteinPct + '%' }" /></div>
            </div>
            <span class="macro-val">{{ Math.round((dailyMacros?.proteinG ?? 0) * 10) / 10 }}g / {{ proteinGoal }}g</span>
          </div>
          <div class="macro-row">
            <span class="macro-dot" style="background:#F4C5AE" />
            <span class="macro-lbl">{{ t('dashboard.carbs') }}</span>
            <div class="macro-bar-wrap">
              <div class="ns-progress-bar-bg"><div class="ns-progress-bar-fill fill-carbs" :style="{ width: carbsPct + '%' }" /></div>
            </div>
            <span class="macro-val">{{ Math.round((dailyMacros?.carbsG ?? 0) * 10) / 10 }}g / {{ carbsGoal }}g</span>
          </div>
          <div class="macro-row">
            <span class="macro-dot" style="background:#f472b6" />
            <span class="macro-lbl">{{ t('dashboard.fat') }}</span>
            <div class="macro-bar-wrap">
              <div class="ns-progress-bar-bg"><div class="ns-progress-bar-fill" style="background:#f472b6" :style="{ width: fatPct + '%' }" /></div>
            </div>
            <span class="macro-val">{{ Math.round((dailyMacros?.fatG ?? 0) * 10) / 10 }}g / {{ fatGoal }}g</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Streak banner -->
    <div class="streak-banner" role="region" :aria-label="t('dashboard.streak')">
      <div class="streak-banner__left">
        <div class="streak-banner__eyebrow">{{ t('dashboard.activeStreak').toUpperCase() }}</div>
        <div class="streak-banner__num">{{ streakCount }}</div>
        <div class="streak-banner__desc">{{ t('dashboard.consecutiveDays') }}</div>
      </div>
      <div class="streak-banner__right">
        <div class="streak-banner__week-label">{{ t('dashboard.thisWeek') }}</div>
        <div class="streak-banner__dots">
          <div
            v-for="(done, i) in weekDays"
            :key="i"
            class="sb-dot"
            :class="{ 'sb-dot--done': done, 'sb-dot--today': i === todayIndex && !done }"
            :aria-label="`${dayLabels[i]}: ${done ? t('dashboard.dayLogged') : t('dashboard.dayNotLogged')}`"
          >
            <span class="sb-dot__circle" />
            <span class="sb-dot__lbl">{{ dayLabels[i] }}</span>
          </div>
        </div>
        <div class="streak-banner__meta">{{ t('dashboard.nextMilestone', { n: 7 }) }}</div>
        <div class="streak-banner__meta">{{ t('dashboard.weeklyPct', { n: weeklyCompletionPercent }) }}</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dash { max-width: 100%; display: flex; flex-direction: column; gap: 1.125rem; }

/* ── Panel override (scoped wins over global in Vue) ── */
.ns-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #edeae7;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
  padding: 1.25rem;
}

/* ── Greeting ── */
.dash__greeting {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.dash__name { font-size: 1.875rem; font-weight: 800; color: var(--color-text); line-height: 1.15; letter-spacing: -0.03em; }
.dash__date { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 0.25rem; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.35rem 0.875rem;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}
.status-pill--ok { border: 1.5px solid var(--color-primary); color: var(--color-primary); }

/* ── KPI cards ── */
.dash__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.kpi {
  background: #fff;
  border: 1px solid #e8e5e2;
  border-radius: 14px;
  padding: 1.25rem 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.kpi__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.125rem;
}
.kpi__label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
}
.kpi__info-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #c4bfba;
  font-size: 0.75rem;
  line-height: 1;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s;
}
.kpi__info-btn:hover { color: var(--color-text-secondary); }
.kpi__info-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.kpi__value {
  font-size: 2.375rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.kpi__value--teal   { color: var(--color-primary); }
.kpi__value--over   { color: var(--color-danger); }
.kpi__value--burned { color: #10b981; }
.kpi__sub { font-size: 0.78125rem; color: var(--color-text-secondary); }
.kpi__bar {
  height: 5px;
  border-radius: 99px;
  background: #f0ece9;
  overflow: hidden;
  margin-top: 0.75rem;
}
.kpi__bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; max-width: 100%; }

/* ── Main grid ── */
.dash__grid { display: grid; grid-template-columns: 1fr 320px; gap: 1rem; align-items: start; }

/* ── Panel title large ── */
.panel-title-lg { font-size: 1.0625rem; font-weight: 700; color: var(--color-text); }

/* ── Outlined button ── */
.outlined-btn {
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: 99px;
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.outlined-btn:hover { background: var(--color-primary); color: #fff; }

/* ── Meal rows ── */
.meal-rows { display: flex; flex-direction: column; }
.meal-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.25rem;
  cursor: pointer;
  transition: background 0.12s;
  border-radius: 8px;
}
.meal-row:hover { background: #faf8f6; }
.meal-row:not(:last-child) { border-bottom: 1px solid #f5f1ee; }

.meal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.meal-row__body  { flex: 1; display: flex; flex-direction: column; gap: 0.0625rem; }
.meal-row__name  { font-size: 0.875rem; font-weight: 700; color: var(--color-text); }
.meal-row__sub   { font-size: 0.75rem; color: var(--color-text-secondary); }
.meal-row__sub--empty { color: #c4bfba; font-style: italic; }
.meal-row__kcal  { font-size: 0.8125rem; font-weight: 600; color: #c4bfba; white-space: nowrap; }
.meal-row__kcal--logged { color: var(--color-primary); }

/* ── Donut chart ── */
.donut-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0.5rem auto 1.25rem;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.donut-center__val { font-size: 1.5rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.03em; line-height: 1; }
.donut-center__lbl { font-size: 0.6875rem; color: var(--color-text-secondary); font-weight: 500; }

/* ── Macro rows ── */
.macro-rows { display: flex; flex-direction: column; gap: 0.75rem; }
.macro-row  { display: flex; align-items: center; gap: 0.5rem; }
.macro-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.macro-lbl  { font-size: 0.8125rem; font-weight: 500; color: var(--color-text-secondary); min-width: 80px; }
.macro-bar-wrap { flex: 1; }
.macro-val  { font-size: 0.75rem; font-weight: 600; color: var(--color-text); white-space: nowrap; min-width: 72px; text-align: right; }

/* ── Streak banner ── */
.streak-banner {
  background: var(--color-primary);
  border-radius: 16px;
  padding: 1.75rem 2rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}
.streak-banner__left { display: flex; flex-direction: column; gap: 0.25rem; }
.streak-banner__eyebrow {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.65);
}
.streak-banner__num {
  font-size: 3.5rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.04em;
}
.streak-banner__desc {
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.75);
}
.streak-banner__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}
.streak-banner__week-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.02em;
}
.streak-banner__dots { display: flex; gap: 0.375rem; }
.sb-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.sb-dot__circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.35);
  background: transparent;
  display: block;
  transition: all 0.15s;
}
.sb-dot--done .sb-dot__circle {
  background: rgba(255,255,255,0.90);
  border-color: transparent;
}
.sb-dot--today .sb-dot__circle {
  border-color: rgba(255,255,255,0.80);
  background: rgba(255,255,255,0.15);
}
.sb-dot__lbl {
  font-size: 0.5625rem;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.05em;
}
.streak-banner__meta {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.65);
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .dash__kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .dash__grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .dash__kpis { grid-template-columns: 1fr 1fr; }
  .dash__name  { font-size: 1.5rem; }
  .streak-banner { flex-direction: column; }
  .streak-banner__right { align-items: flex-start; }
}
</style>
