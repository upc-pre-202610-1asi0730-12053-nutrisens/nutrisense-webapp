<!-- PATH: src/app/smart-recommendations/presentation/components/recommendation-card.component.vue -->
<script setup>
import { useI18n } from 'vue-i18n'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

defineProps({
  recommendation: { type: Object, required: true },
  /** Projected daily calorie % after adding this recommendation. */
  projectedPct:  { type: Number,  default: 0     },
  /** @type {'80'|'110'|'130'|null} */
  bannerLevel:   { type: String,  default: null   },
  /** True when this recommendation conflicts with the user's dietary restrictions. */
  isUnsafe:      { type: Boolean, default: false  },
})

/** @type {(event: 'log', recommendation: Object) => void} */
const emit = defineEmits(['log'])

const { t } = useI18n()

/** @type {Record<string, string>} */
const badgeSeverityMap = {
  'high-protein':  'info',
  'light':         'success',
  'moderate':      'secondary',
  'heavy':         'warn',
  'bulk':          'warn',
  'post-workout':  'danger',
  'local-dish':    'contrast',
}
</script>

<template>
  <div class="rec-card" :class="{ 'rec-card--unsafe': isUnsafe }" role="article">
    <div v-if="isUnsafe" class="rec-card__unsafe-banner" role="note">
      <i class="pi pi-exclamation-triangle" aria-hidden="true" />
      {{ t('recommendations.unsafeHint') }}
    </div>
    <div class="rec-card__header">
      <div class="rec-card__name">
        {{ recommendation.foodId ? t(`food.${recommendation.foodId}`) : recommendation.customFoodName }}
      </div>
      <pv-tag
        v-if="recommendation.badge"
        :value="t(`badge.${recommendation.badge}`)"
        :severity="badgeSeverityMap[recommendation.badge] ?? 'secondary'"
        class="rec-card__badge"
      />
    </div>

    <p v-if="recommendation.contextLabelKey" class="rec-card__context">
      {{ t(recommendation.contextLabelKey) }}
    </p>

    <div class="rec-card__macros-panel">
      <div class="rec-card__macro">
        <span class="rec-card__macro-val">{{ formatNum(recommendation.estimatedCalories, 0) }}</span>
        <span class="rec-card__macro-lbl">{{ t('macros.kcal') }}</span>
      </div>
      <div class="rec-card__macro-divider" aria-hidden="true" />
      <div class="rec-card__macro">
        <span class="rec-card__macro-val">{{ formatNum(recommendation.estimatedProteinG) }}g</span>
        <span class="rec-card__macro-lbl">{{ t('macros.protein') }}</span>
      </div>
      <div class="rec-card__macro-divider" aria-hidden="true" />
      <div class="rec-card__macro">
        <span class="rec-card__macro-val">{{ formatNum(recommendation.estimatedCarbsG) }}g</span>
        <span class="rec-card__macro-lbl">{{ t('macros.carbs') }}</span>
      </div>
      <div class="rec-card__macro-divider" aria-hidden="true" />
      <div class="rec-card__macro">
        <span class="rec-card__macro-val">{{ formatNum(recommendation.estimatedFatG) }}g</span>
        <span class="rec-card__macro-lbl">{{ t('macros.fat') }}</span>
      </div>
    </div>

    <div class="rec-card__proj-bar">
      <div class="ns-progress-bar-bg">
        <div
          class="ns-progress-bar-fill"
          :style="{
            width: Math.min(100, projectedPct) + '%',
            background: bannerLevel === '130'
              ? 'var(--color-danger)'
              : bannerLevel === '110'
                ? '#f97316'
                : 'var(--color-primary)',
          }"
          role="progressbar"
          :aria-valuenow="projectedPct"
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
      <span
        class="rec-card__proj-label"
        :class="{
          'rec-card__proj-label--ok':     bannerLevel === '80',
          'rec-card__proj-label--warn':   bannerLevel === '110',
          'rec-card__proj-label--danger': bannerLevel === '130',
        }"
      >
        <i
          class="pi"
          :class="{
            'pi-check-circle':         bannerLevel === '80',
            'pi-exclamation-triangle': bannerLevel === '110',
            'pi-times-circle':         bannerLevel === '130',
            'pi-chart-bar':            !bannerLevel,
          }"
          aria-hidden="true"
        />
        {{ projectedPct }}%
      </span>
    </div>

    <div class="rec-card__footer">
      <button
        class="rec-card__log-btn"
        :aria-label="t('recommendations.logDish')"
        @click="emit('log', recommendation)"
      >
        <i class="pi pi-plus-circle" aria-hidden="true" />
        {{ t('recommendations.logDish') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.rec-card {
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  padding: 1.125rem;
  border: 1px solid var(--ns-border-light);
  box-shadow: var(--ns-shadow-sm);
  transition: box-shadow var(--ns-transition);
}

.rec-card:hover {
  box-shadow: var(--ns-shadow);
}

.rec-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.rec-card__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ns-text);
  flex: 1;
}

.rec-card__context {
  font-size: 0.8125rem;
  color: var(--ns-text-secondary);
  margin: 0 0 0.875rem;
}

.rec-card__macros-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f3f1;
  border-radius: 10px;
  padding: 0.625rem 0.875rem;
  margin-bottom: 0.75rem;
}

.rec-card__macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  flex: 1;
}

.rec-card__macro-divider {
  width: 1px;
  height: 28px;
  background: #e2ddd9;
  flex-shrink: 0;
}

.rec-card__macro-val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ns-text);
  line-height: 1.2;
}

.rec-card__macro-lbl {
  font-size: 0.6875rem;
  color: var(--ns-text-muted);
  font-weight: 500;
}

.rec-card__proj-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.625rem;
}

.rec-card__proj-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ns-text-muted);
}

.rec-card__proj-label--ok     { color: #16a34a; }
.rec-card__proj-label--warn   { color: #c2410c; }
.rec-card__proj-label--danger { color: #991b1b; }

.rec-card__proj-label .pi { font-size: 0.6875rem; }

.rec-card__footer {
  margin-top: 0.75rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--ns-border-light);
}

.rec-card__log-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  border: 1.5px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.rec-card__log-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.rec-card__log-btn .pi { font-size: 0.8125rem; }

.rec-card--unsafe {
  border-color: #fcd34d;
  background: #fffef5;
}

.rec-card__unsafe-banner {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 0.35rem 0.625rem;
  margin-bottom: 0.625rem;
}

.rec-card__unsafe-banner .pi {
  font-size: 0.75rem;
  color: #d97706;
  flex-shrink: 0;
}
</style>
