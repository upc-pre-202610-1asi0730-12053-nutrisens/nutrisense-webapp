<!-- PATH: src/app/body-health-metrics/presentation/views/body-progress.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBodyHealthMetricsStore } from '../../application/body-health-metrics.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import WeightChart from '../components/weight-chart.component.vue'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const { t } = useI18n()
const store = useBodyHealthMetricsStore()
const iamStore = useIamStore()
const billingStore = useSubscriptionsBillingStore()

const {
  weightLogs,
  userGoal,
  todayWeightLog,
  bodyMeasurements,
  weightLogsLoaded,
  weightSaving,
  errors,
} = toRefs(store)

const { currentUser } = toRefs(iamStore)
const userId = localStorage.getItem('ns_user_id') ?? ''

const newWeight = ref(null)
const showWeightForm = ref(false)
/** @type {import('vue').Ref<string>} */
const weightError = ref('')
const currentTier = computed(() => billingStore.currentTier)
const chartRange = ref('7d')

/**
 * Range tabs with disabled state derived from the user's plan tier.
 * basic → 7d only; pro → 7d + 30d; premium → all.
 */
const rangeTabs = computed(() => {
  const tier = currentTier.value
  const atLeastPro     = tier?.isAtLeast('pro')     ?? false
  const atLeastPremium = tier?.isAtLeast('premium') ?? false
  return [
    { value: '7d',  label: t('bodyProgress.range7d')  },
    { value: '30d', label: t('bodyProgress.range30d'), disabled: !atLeastPro     },
    { value: '90d', label: t('bodyProgress.range90d'), disabled: !atLeastPremium },
  ]
})

watch(currentTier, tier => {
  const atLeastPro     = tier?.isAtLeast('pro')     ?? false
  const atLeastPremium = tier?.isAtLeast('premium') ?? false
  if (chartRange.value === '90d' && !atLeastPremium) chartRange.value = '7d'
  else if (chartRange.value === '30d' && !atLeastPro) chartRange.value = '7d'
})

const latestWeightLog = computed(() => weightLogs.value[0] ?? null)

const bmi = computed(() => {
  if (!latestWeightLog.value || !currentUser.value) return null
  return store.getBmi(latestWeightLog.value.weightKg, currentUser.value.heightCm)
})

const bmiLabel = computed(() => {
  const v = bmi.value?.value
  if (v == null) return ''
  if (v < 18.5) return t('bodyProgress.bmiUnderweight')
  if (v < 25) return t('bodyProgress.bmiNormal')
  if (v < 30) return t('bodyProgress.bmiOverweight')
  return t('bodyProgress.bmiObese')
})

const bmiColor = computed(() => {
  const v = bmi.value?.value
  if (v == null) return 'var(--color-text-secondary)'
  if (v < 18.5) return '#3b82f6'
  if (v < 25) return 'var(--color-success)'
  if (v < 30) return '#f59e0b'
  return 'var(--color-danger)'
})

const bmr = computed(() => {
  if (!latestWeightLog.value || !currentUser.value) return null
  const dob = new Date(currentUser.value.dateOfBirth)
  const age = new Date().getFullYear() - dob.getFullYear()
  return store.getBmr(
    latestWeightLog.value.weightKg,
    currentUser.value.heightCm,
    age,
    currentUser.value.biologicalSex.value,
  )
})

const tdee = computed(() => {
  if (!bmr.value || !currentUser.value) return null
  try {
    const pal = currentUser.value.activityLevel.palMultiplier()
    return store.getTdee(bmr.value, pal)
  } catch {
    return null
  }
})

const filteredWeightLogs = computed(() => {
  const days = chartRange.value === '7d' ? 7 : chartRange.value === '30d' ? 30 : 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return weightLogs.value.filter(l => new Date(l.loggedAt) >= cutoff)
})

const latestMeasurement = computed(() =>
  [...(bodyMeasurements.value ?? [])].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] ?? null
)

const goalProgress = computed(() => {
  if (!userGoal.value || !latestWeightLog.value) return 0
  const total = Math.abs(userGoal.value.targetWeightKg - userGoal.value.startWeightKg)
  if (!total) return 0
  const done = Math.abs(latestWeightLog.value.weightKg - userGoal.value.startWeightKg)
  return Math.min(100, Math.round((done / total) * 100))
})

onMounted(() => {
  if (userId) {
    store.fetchWeightLogs(userId)
    store.fetchUserGoal(userId)
    store.fetchBodyMeasurements(userId)
    if (!currentUser.value) iamStore.fetchCurrentUser(userId)
    if (currentUser.value?.heightCm) store.setUserHeight(currentUser.value.heightCm)
    if (!billingStore.subscriptionLoaded) billingStore.fetchSubscription(userId)
    if (!billingStore.plansLoaded)        billingStore.fetchPlans()
  }
})

watch(showWeightForm, open => {
  if (!open) {
    weightError.value = ''
    newWeight.value = null
  }
})

function handleLogWeight() {
  weightError.value = ''
  const w = newWeight.value
  if (!w || w < 20 || w > 300) {
    weightError.value = t('bodyProgress.errorWeightRange')
    return
  }
  store.updateTodayWeight(userId, w)
  showWeightForm.value = false
}
</script>

<template>
  <div class="body-view">

    <!-- Header -->
    <div class="body-view__header">
      <div>
        <h1 class="body-view__title">{{ t('bodyProgress.title') }}</h1>
        <p class="body-view__subtitle">{{ t('bodyProgress.subtitle') }}</p>
      </div>
      <pv-button
        :icon="todayWeightLog ? 'pi pi-check' : 'pi pi-plus'"
        :label="todayWeightLog ? t('bodyProgress.alreadyLoggedToday') : t('bodyProgress.logWeight')"
        :aria-label="todayWeightLog ? t('bodyProgress.alreadyLoggedToday') : t('bodyProgress.logWeight')"
        :disabled="!!todayWeightLog"
        size="small"
        @click="showWeightForm = true"
      />
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <!-- Already logged banner -->
    <div v-if="todayWeightLog" class="ns-banner ns-banner--success" role="note" aria-live="polite">
      <i class="pi pi-check-circle" aria-hidden="true" style="color:#16a34a;font-size:1rem;flex-shrink:0;margin-top:1px" />
      <div>
        <strong style="font-size:0.8125rem;color:#15803d">{{ t('bodyProgress.alreadyLoggedToday') }}</strong>
        <p style="font-size:0.8125rem;color:#166534;margin-top:1px">{{ formatNum(todayWeightLog.weightKg) }} kg</p>
      </div>
    </div>

    <!-- 3 KPI panels: BMI · BMR · TDEE -->
    <div class="body-kpis">

      <div class="ns-panel body-kpi">
        <div class="body-kpi__header">
          <span class="ns-panel__title">{{ t('bodyProgress.bmi') }}</span>
          <i
            v-tooltip.top="t('bodyProgress.bmiInfo')"
            class="pi pi-info-circle body-kpi__info-icon"
            tabindex="0"
            :aria-label="t('bodyProgress.bmiInfo')"
          />
        </div>
        <pv-skeleton v-if="!weightLogsLoaded" height="2.5rem" border-radius="6px" />
        <template v-else>
          <div class="body-kpi__value">
            {{ bmi?.value != null ? (Math.round(bmi.value * 10) / 10) : '—' }}
          </div>
          <span v-if="bmiLabel" class="body-kpi__badge" :style="{ color: bmiColor, borderColor: bmiColor, background: bmiColor + '15' }">
            {{ bmiLabel }}
          </span>
        </template>
      </div>

      <div class="ns-panel body-kpi">
        <div class="body-kpi__header">
          <span class="ns-panel__title">{{ t('bodyProgress.bmr') }}</span>
          <i
            v-tooltip.top="t('bodyProgress.bmrInfo')"
            class="pi pi-info-circle body-kpi__info-icon"
            tabindex="0"
            :aria-label="t('bodyProgress.bmrInfo')"
          />
        </div>
        <pv-skeleton v-if="!weightLogsLoaded" height="2.5rem" border-radius="6px" />
        <template v-else>
          <div class="body-kpi__value">
            {{ bmr != null ? Math.round(bmr).toLocaleString() : '—' }}
          </div>
          <span class="body-kpi__unit">kcal/day</span>
        </template>
      </div>

      <div class="ns-panel body-kpi">
        <div class="body-kpi__header">
          <span class="ns-panel__title">{{ t('bodyProgress.tdee') }}</span>
          <i
            v-tooltip.top="t('bodyProgress.tdeeInfo')"
            class="pi pi-info-circle body-kpi__info-icon"
            tabindex="0"
            :aria-label="t('bodyProgress.tdeeInfo')"
          />
        </div>
        <pv-skeleton v-if="!weightLogsLoaded" height="2.5rem" border-radius="6px" />
        <template v-else>
          <div class="body-kpi__value">
            {{ tdee != null ? Math.round(tdee).toLocaleString() : '—' }}
          </div>
          <span class="body-kpi__unit">kcal/day</span>
        </template>
      </div>

    </div>

    <!-- Body: chart (left) + side panels (right) -->
    <div class="body-view__body">

      <!-- Weight chart panel -->
      <div class="ns-panel">
        <div class="ns-panel__header">
          <span class="ns-panel__title">{{ t('bodyProgress.weightHistory') }}</span>
          <ns-tabs v-model="chartRange" :tabs="rangeTabs" size="sm" />
        </div>

        <pv-skeleton v-if="!weightLogsLoaded" height="160px" border-radius="8px" />
        <div v-else-if="!filteredWeightLogs.length" class="body-empty">
          <i class="pi pi-chart-line" aria-hidden="true" />
          <span>{{ t('bodyProgress.noData') }}</span>
        </div>
        <weight-chart v-else :weight-logs="filteredWeightLogs" :label="t('bodyProgress.weight')" />
      </div>

      <!-- Side panels -->
      <div class="body-view__side">

        <!-- Goal progress -->
        <div v-if="userGoal" class="ns-panel">
          <div class="ns-panel__header">
            <span class="ns-panel__title">{{ t('bodyProgress.goal') }}</span>
            <span class="body-goal-pct">{{ goalProgress }}%</span>
          </div>
          <div class="body-rows">
            <div class="body-row">
              <span>{{ t('bodyProgress.startWeight') }}</span>
              <strong>{{ formatNum(userGoal.startWeightKg) }} kg</strong>
            </div>
            <div class="body-row">
              <span>{{ t('bodyProgress.targetWeight') }}</span>
              <strong>{{ formatNum(userGoal.targetWeightKg) }} kg</strong>
            </div>
            <div class="body-row">
              <span>{{ t('bodyProgress.weight') }}</span>
              <strong>{{ latestWeightLog ? formatNum(latestWeightLog.weightKg) : '—' }} kg</strong>
            </div>
          </div>
          <div class="ns-progress-wrap" style="margin-top:0.875rem">
            <div class="ns-progress-bar-bg">
              <div class="ns-progress-bar-fill fill-primary" :style="{ width: goalProgress + '%' }" />
            </div>
          </div>
        </div>

        <!-- Body measurements -->
        <div class="ns-panel">
          <div class="ns-panel__header">
            <span class="ns-panel__title">{{ t('bodyProgress.measurements') }}</span>
          </div>
          <div v-if="!latestMeasurement" class="body-empty body-empty--sm">
            <i class="pi pi-ruler" aria-hidden="true" />
            <span>{{ t('bodyProgress.noMeasurements') }}</span>
          </div>
          <div v-else class="body-rows">
            <div class="body-row">
              <span>{{ t('bodyProgress.waist') }}</span>
              <strong>{{ formatNum(latestMeasurement.waistCm) }} cm</strong>
            </div>
            <div class="body-row">
              <span>{{ t('bodyProgress.actualWeight') }}</span>
              <strong>{{ latestWeightLog ? formatNum(latestWeightLog.weightKg) : '—' }} kg</strong>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Log / update weight dialog -->
    <pv-dialog
      :visible="showWeightForm"
      :header="todayWeightLog ? t('bodyProgress.updateWeight') : t('bodyProgress.logWeight')"
      :modal="true"
      :draggable="false"
      style="width:320px;max-width:95vw"
      @update:visible="val => !val && (showWeightForm = false)"
    >
      <div class="weight-dialog-body">
        <div class="weight-dialog-field">
          <label for="weight-input" class="weight-dialog-label">
            {{ t('bodyProgress.weightKg') }}
          </label>
          <pv-input-number
            id="weight-input"
            v-model="newWeight"
            :min="20"
            :max="300"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            :placeholder="todayWeightLog ? String(todayWeightLog.weightKg) : '70.0'"
            :aria-label="t('bodyProgress.weightKg')"
            :aria-describedby="weightError ? 'weight-error' : undefined"
            :invalid="!!weightError"
            class="w-full"
            suffix=" kg"
            @update:model-value="weightError = ''"
          />
          <small
            v-if="weightError"
            id="weight-error"
            class="field-error"
            role="alert"
            aria-live="assertive"
          >
            {{ weightError }}
          </small>
        </div>
      </div>
      <template #footer>
        <pv-button :label="t('bodyProgress.cancel')" text @click="showWeightForm = false" />
        <pv-button
          :label="t('bodyProgress.save')"
          :loading="weightSaving"
          :disabled="weightSaving"
          @click="handleLogWeight"
        />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.body-view {
  max-width: 100%;
}

.ns-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #edeae7;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
  padding: 1.25rem;
}

.body-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.body-view__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.125rem;
}

.body-view__subtitle {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

/* KPI row */
.body-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.body-kpi {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.body-kpi__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.body-kpi__info-icon {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: default;
  transition: color 0.15s;
}
.body-kpi__info-icon:hover { color: var(--color-primary); }

.body-kpi__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.body-kpi__unit {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-top: -0.25rem;
}

.body-kpi__badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid currentColor;
}

/* Two-column layout */
.body-view__body {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 1rem;
}

.body-view__side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Goal section */
.body-goal-pct {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-primary);
}

.body-rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.body-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.body-row strong {
  color: var(--color-text);
  font-weight: 600;
}

/* Empty states */
.body-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 2.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.body-empty i { font-size: 2rem; color: var(--color-border); }

.body-empty--sm {
  padding: 1rem 0;
  flex-direction: row;
  justify-content: center;
}
.body-empty--sm i { font-size: 1rem; }

@media (max-width: 768px) {
  .body-kpis { grid-template-columns: 1fr; }
  .body-view__body { grid-template-columns: 1fr; }
}

/* Weight dialog */
.weight-dialog-body { padding-top: 0.5rem; }

.weight-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.weight-dialog-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.field-error {
  font-size: 0.75rem;
  color: var(--color-danger, #ef4444);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
