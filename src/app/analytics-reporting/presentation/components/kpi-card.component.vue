<!-- PATH: src/app/analytics-reporting/presentation/components/kpi-card.component.vue -->
<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  icon: { type: String, default: 'pi-chart-bar' },
  color: { type: String, default: 'var(--ns-primary)' },
  loading: { type: Boolean, default: false },
})

const { t } = useI18n()
</script>

<template>
  <div class="kpi-card" role="article">
    <div class="kpi-card__icon" :style="{ background: color + '18', color }">
      <i :class="['pi', icon]" aria-hidden="true" />
    </div>
    <div class="kpi-card__body">
      <pv-skeleton v-if="loading" width="4rem" height="1.75rem" class="mb-1" />
      <div v-else class="kpi-card__value">
        {{ value }}<span v-if="unit" class="kpi-card__unit">{{ unit }}</span>
      </div>
      <div class="kpi-card__label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--ns-shadow-sm);
  border: 1px solid var(--ns-border-light);
}

.kpi-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--ns-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.kpi-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ns-text);
  line-height: 1.2;
}

.kpi-card__unit {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
  margin-left: 0.25rem;
}

.kpi-card__label {
  font-size: 0.75rem;
  color: var(--ns-text-muted);
  margin-top: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
