<!-- PATH: src/app/activity-wearable/presentation/components/health-sync-dialog.component.vue -->
<script setup>
import { ref, computed, watch, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useActivityWearableStore } from '../../application/activity-wearable.store.js'
import { startHealthOAuth, isHealthOAuthConfigured } from '../../infrastructure/oauth-health.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  userId: { type: String, default: '' },
})
const emit = defineEmits(['update:visible'])

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const store = useActivityWearableStore()

const { healthConnection, isHealthConnected } = toRefs(store)

const connecting = ref(false)
const syncing = ref(false)
const togglingAutoSync = ref(false)
/** Local mirror of the auto-sync switch so we can roll back on failure. */
const autoSyncModel = ref(false)

watch(healthConnection, (c) => { autoSyncModel.value = c?.autoSyncEnabled ?? false }, { immediate: true })

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

/** @param {string|null|undefined} iso */
function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

const lastSyncLabel = computed(() =>
  healthConnection.value?.lastSyncedAt
    ? formatDate(healthConnection.value.lastSyncedAt)
    : t('activity.health.neverSynced'),
)

function handleConnect() {
  if (!isHealthOAuthConfigured()) {
    toast.add({ severity: 'warn', summary: t('activity.health.notConfiguredTitle'),
      detail: t('activity.health.notConfigured'), life: 6000 })
    return
  }
  // Full-page redirect to Google's consent screen. The flow resumes on the
  // /oauth/health/callback route, which returns to the activity view.
  connecting.value = true
  startHealthOAuth()
}

async function handleSyncNow() {
  if (!healthConnection.value) return
  syncing.value = true
  try {
    await store.syncHealth(healthConnection.value.id, props.userId)
    toast.add({ severity: 'success', summary: t('activity.health.syncedTitle'),
      detail: t('activity.health.syncedDetail'), life: 3500 })
  } catch {
    toast.add({ severity: 'error', summary: t('common.error'),
      detail: t('activity.health.syncError'), life: 4000 })
  } finally {
    syncing.value = false
  }
}

async function handleAutoSyncChange(value) {
  if (!healthConnection.value) return
  const previous = !value
  togglingAutoSync.value = true
  try {
    await store.setAutoSync(healthConnection.value.id, value)
  } catch {
    autoSyncModel.value = previous // roll back
    toast.add({ severity: 'error', summary: t('common.error'),
      detail: t('activity.health.autoSyncError'), life: 4000 })
  } finally {
    togglingAutoSync.value = false
  }
}

function handleDisconnect() {
  if (!healthConnection.value) return
  confirm.require({
    message: t('activity.health.disconnectConfirm'),
    header: t('activity.health.disconnectHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('activity.health.disconnect'),
    rejectLabel: t('common.cancel'),
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.disconnectWearable(healthConnection.value.id)
        toast.add({ severity: 'success', summary: t('activity.health.disconnectedTitle'),
          detail: t('activity.health.disconnectedDetail'), life: 3500 })
        dialogVisible.value = false
      } catch {
        toast.add({ severity: 'error', summary: t('common.error'),
          detail: t('activity.health.disconnectError'), life: 4000 })
      }
    },
  })
}
</script>

<template>
  <pv-dialog
    v-model:visible="dialogVisible"
    modal
    :draggable="false"
    :style="{ width: '30rem', maxWidth: '95vw' }"
    :header="t('activity.health.title')"
  >
    <div class="health-dialog">
      <div class="health-dialog__brand">
        <span class="health-dialog__icon" :class="{ 'is-on': isHealthConnected }" aria-hidden="true">
          <i class="pi pi-heart-fill" />
        </span>
        <div>
          <p class="health-dialog__provider">{{ t('activity.health.provider') }}</p>
          <p class="health-dialog__status" :class="isHealthConnected ? 'is-connected' : 'is-idle'">
            {{ isHealthConnected ? t('activity.connected') : t('activity.notConnected') }}
          </p>
        </div>
      </div>

      <!-- Disconnected state -->
      <template v-if="!isHealthConnected">
        <p class="health-dialog__lead">{{ t('activity.health.connectLead') }}</p>
        <ul class="health-dialog__perms">
          <li><i class="pi pi-check-circle" /> {{ t('activity.health.permActivity') }}</li>
          <li><i class="pi pi-check-circle" /> {{ t('activity.health.permCalories') }}</li>
        </ul>
        <pv-button
          class="health-dialog__cta"
          icon="pi pi-sync"
          :label="t('activity.health.connectButton')"
          :loading="connecting"
          @click="handleConnect"
        />
        <p class="health-dialog__hint">{{ t('activity.health.redirectHint') }}</p>
      </template>

      <!-- Connected state -->
      <template v-else>
        <div class="health-dialog__info">
          <div class="health-dialog__row">
            <span class="health-dialog__label">{{ t('activity.health.connectedSince') }}</span>
            <span class="health-dialog__value">{{ formatDate(healthConnection?.authorizedAt) }}</span>
          </div>
          <div class="health-dialog__row">
            <span class="health-dialog__label">{{ t('activity.lastSyncLabel') }}</span>
            <span class="health-dialog__value">{{ lastSyncLabel }}</span>
          </div>
        </div>

        <div class="health-dialog__autosync">
          <div>
            <p class="health-dialog__autosync-title">{{ t('activity.health.autoSyncTitle') }}</p>
            <p class="health-dialog__autosync-desc">{{ t('activity.health.autoSyncDesc') }}</p>
          </div>
          <pv-toggle-switch
            v-model="autoSyncModel"
            :disabled="togglingAutoSync"
            :aria-label="t('activity.health.autoSyncTitle')"
            @update:model-value="handleAutoSyncChange"
          />
        </div>

        <div class="health-dialog__actions">
          <pv-button
            text
            icon="pi pi-sync"
            :label="t('activity.health.syncNow')"
            :loading="syncing"
            @click="handleSyncNow"
          />
          <pv-button
            severity="danger"
            outlined
            icon="pi pi-times-circle"
            :label="t('activity.health.disconnect')"
            @click="handleDisconnect"
          />
        </div>
      </template>
    </div>
  </pv-dialog>
</template>

<style scoped>
.health-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.health-dialog__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.health-dialog__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 1.15rem;
}

.health-dialog__icon.is-on {
  background: #dcfce7;
  color: #16a34a;
}

.health-dialog__provider {
  margin: 0;
  font-weight: 600;
  color: var(--ns-text);
}

.health-dialog__status {
  margin: 0;
  font-size: 0.8125rem;
}

.health-dialog__status.is-connected { color: #16a34a; }
.health-dialog__status.is-idle { color: #6b7280; }

.health-dialog__lead {
  margin: 0;
  color: var(--ns-text-muted, #6b7280);
}

.health-dialog__perms {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.health-dialog__perms li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--ns-text);
}

.health-dialog__perms .pi { color: #16a34a; }

.health-dialog__cta {
  width: 100%;
}

.health-dialog__hint,
.health-dialog__autosync-desc {
  font-size: 0.75rem;
  color: var(--ns-text-muted, #9ca3af);
  margin: 0;
}

.health-dialog__hint {
  text-align: center;
}

.health-dialog__info {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  background: var(--ns-surface-alt, #f9fafb);
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
}

.health-dialog__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
}

.health-dialog__label { color: var(--ns-text-muted, #6b7280); }
.health-dialog__value { color: var(--ns-text); font-weight: 500; }

.health-dialog__autosync {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--ns-border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
}

.health-dialog__autosync-title {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ns-text);
}

.health-dialog__actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}
</style>
