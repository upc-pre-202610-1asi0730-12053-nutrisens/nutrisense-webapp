<!-- PATH: src/app/activity-wearable/presentation/views/activity-history.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { useActivityWearableStore } from '../../application/activity-wearable.store.js'
import ActivityLogList from '../components/activity-log-list.component.vue'

const PAGE_SIZE = 10

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const store = useActivityWearableStore()

const { allLogsSorted, logsLoaded, errors } = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''
const first = ref(0)

onMounted(() => {
  if (userId && !logsLoaded.value) store.fetchActivityLogs(userId)
})

/** @type {import('vue').ComputedRef<number>} */
const total = computed(() => allLogsSorted.value.length)

/**
 * Slice of all logs for the current page.
 * @type {import('vue').ComputedRef<ReturnType<import('../../domain/model/activity-log.entity.js').ActivityLog>[]>}
 */
const pageLogs = computed(() =>
  allLogsSorted.value.slice(first.value, first.value + PAGE_SIZE),
)

/** @param {{ first: number }} event */
function onPage(event) {
  first.value = event.first
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
  <div class="history-view">
    <div class="history-view__header">
      <pv-button
        text
        icon="pi pi-arrow-left"
        :label="t('activity.backToActivity')"
        :aria-label="t('activity.backToActivity')"
        @click="router.push({ name: 'activity' })"
      />
      <div class="history-view__title-block">
        <h1 class="history-view__title">{{ t('activity.historyTitle') }}</h1>
        <span class="history-view__subtitle">{{ t('activity.historySubtitle') }}</span>
      </div>
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <pv-card class="history-view__card">
      <template #content>
        <activity-log-list
          :logs="pageLogs"
          :loading="!logsLoaded"
          show-date
          :empty-text="t('activity.noHistory')"
          @remove="handleRemove"
        />

        <pv-paginator
          v-if="total > PAGE_SIZE"
          :rows="PAGE_SIZE"
          :total-records="total"
          :first="first"
          :rows-per-page-options="[]"
          class="history-view__paginator"
          @page="onPage"
        />
      </template>
    </pv-card>

  </div>
</template>

<style scoped>
.history-view {
  max-width: 100%;
}

.history-view__header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.history-view__title-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.history-view__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0;
  line-height: 1.2;
}

.history-view__subtitle {
  font-size: 0.875rem;
  color: var(--ns-text-muted);
}

.history-view__card {
  width: 100%;
}

.history-view__paginator {
  margin-top: 0.75rem;
  border-top: 1px solid var(--ns-border-light);
  padding-top: 0.75rem;
}
</style>
