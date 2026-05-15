<!-- PATH: src/app/activity-wearable/presentation/components/activity-log-list.component.vue -->
<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  logs: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  /** Show the log date on each row — intended for history panels */
  showDate: { type: Boolean, default: false },
  /** Override the empty-state message (already translated) */
  emptyText: { type: String, default: '' },
})

const emit = defineEmits(['remove'])
const { t, locale } = useI18n()

/**
 * Formats a YYYY-MM-DD date string into a short human-readable label.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(
    new Date(isoDate + 'T00:00:00'),
  )
}

/**
 * Formats an ISO datetime string into a locale-aware time (e.g. "3:45 PM").
 * @param {string} isoDatetime
 * @returns {string}
 */
function formatTime(isoDatetime) {
  return new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(isoDatetime),
  )
}
</script>

<template>
  <div class="activity-list" role="list">
    <div v-if="loading">
      <pv-skeleton v-for="i in 3" :key="i" height="60px" class="mb-2" border-radius="8px" />
    </div>

    <div v-else-if="!logs.length" class="activity-list__empty">
      <i class="pi pi-bolt activity-list__empty-icon" aria-hidden="true" />
      <span>{{ emptyText || t('activity.noActivity') }}</span>
    </div>

    <div v-else>
      <div
        v-for="log in logs"
        :key="log.id"
        class="activity-item"
        role="listitem"
      >
        <div class="activity-item__icon" :class="`activity-item__icon--${log.intensity.value}`">
          <i class="pi pi-bolt" aria-hidden="true" />
        </div>
        <div class="activity-item__info">
          <div class="activity-item__type-row">
            <span class="activity-item__type">{{ t(`activityType.${log.activityType.value}`) }}</span>
            <span v-if="showDate" class="activity-item__date">{{ formatDate(log.date) }}</span>
          </div>
          <div class="activity-item__meta">
            <span>{{ t('activity.min', { n: log.durationMinutes }) }}</span>
            <span>·</span>
            <span>{{ t('activity.kcal', { n: log.caloriesBurned }) }}</span>
            <span>·</span>
            <span class="activity-item__intensity">{{ t(`intensity.${log.intensity.value}`) }}</span>
            <span v-if="log.loggedAt">·</span>
            <span v-if="log.loggedAt" class="activity-item__logged-at" :aria-label="t('activity.loggedAt', { time: formatTime(log.loggedAt) })">
              <i class="pi pi-clock" aria-hidden="true" />
              {{ formatTime(log.loggedAt) }}
            </span>
          </div>
        </div>
        <pv-button
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          size="small"
          :aria-label="t('activity.remove')"
          @click="emit('remove', log.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--ns-text-muted);
  font-size: 0.875rem;
}

.activity-list__empty-icon {
  font-size: 1.5rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--ns-border-light);
}

.activity-item:last-child { border-bottom: none; }

.activity-item__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--ns-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.activity-item__icon--low    { background: rgba(34, 197, 94, 0.1); color: var(--ns-primary); }
.activity-item__icon--medium { background: rgba(249, 115, 22, 0.1); color: var(--ns-accent); }
.activity-item__icon--high   { background: rgba(239, 68, 68, 0.1); color: var(--ns-danger); }

.activity-item__info { flex: 1; min-width: 0; }

.activity-item__type-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.activity-item__type {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-text);
}

.activity-item__date {
  font-size: 0.75rem;
  color: var(--ns-text-muted);
  white-space: nowrap;
}

.activity-item__meta {
  display: flex;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--ns-text-muted);
  margin-top: 0.125rem;
}

.activity-item__intensity { text-transform: capitalize; }

.activity-item__logged-at {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}
</style>
