<!-- PATH: src/app/nutrition-tracking/presentation/components/nutrition-log-list.component.vue -->
<script setup>
import { useI18n } from 'vue-i18n'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

defineProps({
  logs: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['remove'])

const { t } = useI18n()
</script>

<template>
  <div class="log-list" role="list" :aria-label="t('nutrition.title')">
    <div v-if="loading">
      <pv-skeleton v-for="i in 3" :key="i" height="52px" class="mb-2" border-radius="8px" />
    </div>

    <div v-else-if="!logs.length" class="log-list__empty">
      <i class="pi pi-inbox log-list__empty-icon" aria-hidden="true" />
      <span>{{ t('nutrition.noLogs') }}</span>
    </div>

    <div v-else>
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-item"
        role="listitem"
      >
        <div class="log-item__info">
          <span class="log-item__name">{{ t(log.foodKey) }}</span>
          <span class="log-item__qty">{{ t('nutrition.grams', { n: log.quantityG }) }}</span>
        </div>
        <div class="log-item__macros">
          <span class="log-item__macro log-item__macro--cal">{{ formatNum(log.macros().calories, 1) }} {{ t('nutrition.calories') }}</span>
          <span class="log-item__macro log-item__macro--pro">P {{ formatNum(log.macros().proteinG, 1) }}g</span>
          <span class="log-item__macro log-item__macro--carb">C {{ formatNum(log.macros().carbsG, 1) }}g</span>
          <span class="log-item__macro log-item__macro--fat">F {{ formatNum(log.macros().fatG, 1) }}g</span>
        </div>
        <pv-button
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          size="small"
          :aria-label="t('nutrition.remove')"
          @click="emit('remove', log.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: var(--ns-text-muted);
  font-size: 0.875rem;
}

.log-list__empty-icon {
  font-size: 1.5rem;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--ns-border-light);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item__info {
  flex: 1;
  min-width: 0;
}

.log-item__name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-item__qty {
  font-size: 0.75rem;
  color: var(--ns-text-muted);
}

.log-item__macros {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.log-item__macro {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  border-radius: var(--ns-radius-xs);
  font-weight: 500;
}

.log-item__macro--cal { background: rgba(249, 115, 22, 0.1); color: var(--ns-accent); }
.log-item__macro--pro { background: rgba(59, 130, 246, 0.1); color: var(--ns-protein-color); }
.log-item__macro--carb { background: rgba(249, 115, 22, 0.08); color: var(--ns-carbs-color); }
.log-item__macro--fat  { background: rgba(168, 85, 247, 0.1); color: var(--ns-fat-color); }
</style>
