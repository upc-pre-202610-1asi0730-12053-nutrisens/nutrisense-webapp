<!-- PATH: src/app/activity-wearable/presentation/views/activity.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { backendMessage } from '../../../shared/infrastructure/api-error.js'
import { useActivityWearableStore } from '../../application/activity-wearable.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import ActivityLogList from '../components/activity-log-list.component.vue'
import ActivityLogForm from '../components/activity-log-form.component.vue'
import HealthSyncDialog from '../components/health-sync-dialog.component.vue'
import KpiCard from '../../../analytics-reporting/presentation/components/kpi-card.component.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const confirm = useConfirm()
const toast = useToast()
const store = useActivityWearableStore()
const billingStore = useSubscriptionsBillingStore()

const {
  todayLogs,
  todayCaloriesBurned,
  todayActiveMinutes,
  healthConnection,
  isHealthConnected,
  logsLoaded,
  connectionsLoaded,
  errors,
} = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''
const showForm = ref(false)
const showHealthDialog = ref(false)

/** True only for Premium — the tier that includes Google Health sync. */
const hasHealthAccess = computed(() =>
  billingStore.currentTier?.isAtLeast('premium') ?? false
)

onMounted(() => {
  if (userId) {
    store.fetchActivityLogs(userId)
    store.fetchConnections(userId).then(maybeAutoSync)
    if (!billingStore.subscriptionLoaded) billingStore.fetchSubscription(userId)
    if (!billingStore.plansLoaded)        billingStore.fetchPlans()
  }
  notifyHealthOAuthResult()
})

/**
 * Surfaces the outcome of the Health OAuth redirect (signalled via ?health=) as a
 * toast, then strips the query param so it doesn't fire again on navigation.
 */
function notifyHealthOAuthResult() {
  const result = route.query.health
  if (!result) return
  if (result === 'connected') {
    toast.add({ severity: 'success', summary: t('activity.health.connectedTitle'),
      detail: t('activity.health.connectedDetail'), life: 4000 })
  } else if (result === 'error') {
    toast.add({ severity: 'error', summary: t('common.error'),
      detail: t('activity.health.connectError'), life: 5000 })
  }
  router.replace({ name: 'activity', query: {} })
}

/**
 * Client-driven auto-sync: if the connection is active, has auto-sync enabled and
 * is stale, trigger a background sync once on load.
 */
function maybeAutoSync() {
  const c = healthConnection.value
  if (c && c.isConnected() && c.autoSyncEnabled && c.needsSync()) {
    store.syncHealth(c.id, userId).catch(() => { /* surfaced via store errors */ })
  }
}

/** Opens the Health sync dialog, or routes Premium-locked users to upgrade. */
function handleHealthChipClick() {
  if (!hasHealthAccess.value) {
    router.push({ name: 'plan-selection' })
    return
  }
  showHealthDialog.value = true
}

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
        <pv-skeleton v-if="!connectionsLoaded" width="120px" height="2rem" border-radius="2rem" />
        <button
          v-else-if="!hasHealthAccess"
          type="button"
          class="wearable-chip wearable-chip--locked"
          :aria-label="t('activity.health.lockedLabel')"
          @click="handleHealthChipClick"
        >
          <i class="pi pi-lock wearable-chip__lock" aria-hidden="true" />
          <span class="wearable-chip__label">{{ t('activity.health.provider') }}</span>
        </button>
        <button
          v-else
          type="button"
          class="wearable-chip"
          :class="isHealthConnected ? 'wearable-chip--connected' : 'wearable-chip--disconnected'"
          aria-haspopup="dialog"
          :aria-label="isHealthConnected ? t('activity.connected') : t('activity.notConnected')"
          @click="handleHealthChipClick"
        >
          <span class="wearable-chip__dot" aria-hidden="true" />
          <span class="wearable-chip__label">{{ t('activity.health.provider') }}</span>
        </button>
        <pv-button
          icon="pi pi-plus"
          :label="t('activity.logActivity')"
          :aria-label="t('activity.logActivity')"
          @click="showForm = true"
        />
      </div>
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ backendMessage(errors[errors.length - 1]) ?? t('common.error') }}
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

    <health-sync-dialog
      v-model:visible="showHealthDialog"
      :user-id="userId"
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
  font-family: inherit;
  border: 1px solid transparent;
  user-select: none;
  cursor: pointer;
  transition: filter 0.15s ease, box-shadow 0.15s ease;
}

.wearable-chip:hover {
  filter: brightness(0.97);
}

.wearable-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ns-primary-soft, rgba(34, 197, 94, 0.35));
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
