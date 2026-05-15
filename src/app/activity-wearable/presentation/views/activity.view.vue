<!-- PATH: src/app/activity-wearable/presentation/views/activity.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { useActivityWearableStore } from '../../application/activity-wearable.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import ActivityLogList from '../components/activity-log-list.component.vue'
import ActivityLogForm from '../components/activity-log-form.component.vue'
import KpiCard from '../../../analytics-reporting/presentation/components/kpi-card.component.vue'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const store = useActivityWearableStore()
const billingStore = useSubscriptionsBillingStore()

const {
  todayLogs,
  todayCaloriesBurned,
  todayActiveMinutes,
  isGoogleFitConnected,
  logsLoaded,
  connectionsLoaded,
  errors,
} = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''
const showForm = ref(false)

/** True only for Premium — the tier that includes Google Fit sync. */
const hasGoogleFitAccess = computed(() =>
  billingStore.currentTier?.isAtLeast('premium') ?? false
)

onMounted(() => {
  if (userId) {
    store.fetchActivityLogs(userId)
    store.fetchConnections(userId)
    if (!billingStore.subscriptionLoaded) billingStore.fetchSubscription(userId)
    if (!billingStore.plansLoaded)        billingStore.fetchPlans()
  }
})

/**
 * Saves a new activity log entry.
 * @param {{ activityType: string, intensity: string, durationMinutes: number, caloriesBurned: number }} data
 */
function handleAddActivity(data) {
  store.logActivity(userId, { ...data, loggedAt: new Date() })
  showForm.value = false
}

/**
 * Prompts the user to confirm before removing an activity log entry.
 * @param {string} logId
 */
function handleRemove(logId) {
  confirm.require({
    message: t('activity.removeConfirmMessage'),
    header: t('activity.removeConfirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptClass: 'p-button-danger',
    accept: () => store.removeActivity(logId),
  })
}
</script>

<template>
  <div class="activity-view">
    <div class="activity-view__header">
      <h1 class="activity-view__title">{{ t('activity.title') }}</h1>
      <div class="activity-view__header-actions">
        <pv-skeleton v-if="!connectionsLoaded" width="110px" height="2rem" border-radius="2rem" />
        <div
          v-else-if="!hasGoogleFitAccess"
          class="wearable-chip wearable-chip--locked"
          role="img"
          :aria-label="t('activity.googleFitLocked')"
        >
          <i class="pi pi-lock wearable-chip__lock" aria-hidden="true" />
          <span class="wearable-chip__label">Google Fit</span>
        </div>
        <div
          v-else
          class="wearable-chip"
          :class="isGoogleFitConnected ? 'wearable-chip--connected' : 'wearable-chip--disconnected'"
          role="status"
          :aria-label="isGoogleFitConnected ? t('activity.connected') : t('activity.notConnected')"
        >
          <span class="wearable-chip__dot" aria-hidden="true" />
          <span class="wearable-chip__label">Google Fit</span>
        </div>
        <pv-button
          icon="pi pi-plus"
          :label="t('activity.logActivity')"
          :aria-label="t('activity.logActivity')"
          @click="showForm = true"
        />
      </div>
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <div class="activity-view__kpis">
      <kpi-card
        :label="t('activity.activeMinutes')"
        :value="todayActiveMinutes"
        unit="min"
        icon="pi-clock"
        color="var(--ns-secondary)"
        :loading="!logsLoaded"
      />
      <kpi-card
        :label="t('activity.caloriesBurned')"
        :value="todayCaloriesBurned"
        unit="kcal"
        icon="pi-bolt"
        color="var(--ns-danger)"
        :loading="!logsLoaded"
      />
    </div>

    <div class="activity-view__body">
      <pv-card>
        <template #title>
          <div class="panel-header">
            <span>{{ t('activity.todayActivity') }}</span>
            <pv-button
              text
              size="small"
              icon="pi pi-history"
              :label="t('activity.viewHistory')"
              :aria-label="t('activity.viewHistory')"
              @click="router.push({ name: 'activity-history' })"
            />
          </div>
        </template>
        <template #content>
          <activity-log-list
            :logs="todayLogs"
            :loading="!logsLoaded"
            @remove="handleRemove"
          />
        </template>
      </pv-card>
    </div>

    <activity-log-form
      :visible="showForm"
      @submit="handleAddActivity"
      @cancel="showForm = false"
    />

  </div>
</template>

<style scoped>
.activity-view {
  max-width: 100%;
}

.activity-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.activity-view__header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wearable-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid transparent;
  user-select: none;
}

.wearable-chip--connected {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.wearable-chip--disconnected {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #6b7280;
}

.wearable-chip__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.wearable-chip--connected .wearable-chip__dot {
  background: #22c55e;
}

.wearable-chip--disconnected .wearable-chip__dot {
  background: #9ca3af;
}

.wearable-chip--locked {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #9ca3af;
}

.wearable-chip__lock {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.activity-view__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0;
}

.activity-view__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.activity-view__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
</style>
