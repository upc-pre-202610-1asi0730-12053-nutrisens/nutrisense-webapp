<!-- PATH: src/app/smart-recommendations/presentation/components/recipe-card.component.vue -->
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const props = defineProps({
  recipe: { type: Object, required: true },
  pantryIngredientIds: { type: Array, default: () => [] },
  missingLabel: { type: String, default: 'missing' },
  /** Projected daily calorie % after adding this recipe. */
  projectedPct: { type: Number,  default: 0     },
  /** @type {'80'|'110'|'130'|null} */
  bannerLevel:  { type: String,  default: null  },
  /** True when this recipe conflicts with the user's dietary restrictions. */
  isUnsafe:     { type: Boolean, default: false },
})

const emit = defineEmits(['detail'])

const { t } = useI18n()

const missingCount = computed(() =>
  props.recipe.missingIngredients(props.pantryIngredientIds).length
)

const matchScore = computed(() => {
  const total = props.recipe.ingredients.length
  if (!total) return 0
  return Math.round(((total - missingCount.value) / total) * 100)
})
</script>

<template>
  <div class="recipe-card" :class="{ 'recipe-card--unsafe': isUnsafe }" role="article">
    <div v-if="isUnsafe" class="recipe-card__unsafe-banner" role="note">
      <i class="pi pi-exclamation-triangle" aria-hidden="true" />
      {{ t('recommendations.unsafeHint') }}
    </div>
    <div class="recipe-card__header">
      <span class="recipe-card__name">{{ t(recipe.key) }}</span>
      <pv-tag
        :value="`${matchScore}%`"
        :severity="matchScore >= 70 ? 'success' : 'warn'"
      />
    </div>

    <div class="recipe-card__meta">
      <span><i class="pi pi-clock" aria-hidden="true" /> {{ t('recommendations.prepTime', { n: recipe.prepTimeMinutes }) }}</span>
      <span><i class="pi pi-fire" aria-hidden="true" /> {{ t('recommendations.calories', { n: formatNum(recipe.totalMacros.calories, 0) }) }}</span>
    </div>

    <div v-if="missingCount > 0" class="recipe-card__missing">
      <i class="pi pi-info-circle" aria-hidden="true" />
      {{ t('recommendations.missing', { n: missingCount }) }}
    </div>

    <div class="recipe-card__proj-bar">
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
        class="recipe-card__proj-label"
        :class="{
          'recipe-card__proj-label--ok':     bannerLevel === '80',
          'recipe-card__proj-label--warn':   bannerLevel === '110',
          'recipe-card__proj-label--danger': bannerLevel === '130',
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

    <div class="recipe-card__footer">
      <button
        class="recipe-card__detail-btn"
        :aria-label="t('recommendations.recipeDetail')"
        @click="emit('detail', recipe)"
      >
        <i class="pi pi-list" aria-hidden="true" />
        {{ t('recommendations.logRecipe') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.recipe-card {
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  padding: 1rem;
  border: 1px solid var(--ns-border-light);
  box-shadow: var(--ns-shadow-sm);
}

.recipe-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.recipe-card__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ns-text);
}

.recipe-card__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--ns-text-secondary);
  margin-bottom: 0.5rem;
}

.recipe-card__meta i {
  font-size: 0.875rem;
  margin-right: 0.25rem;
}

.recipe-card__missing {
  font-size: 0.75rem;
  color: var(--ns-warning);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.recipe-card__proj-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.625rem;
}

.recipe-card__proj-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ns-text-muted);
}

.recipe-card__proj-label--ok     { color: #16a34a; }
.recipe-card__proj-label--warn   { color: #c2410c; }
.recipe-card__proj-label--danger { color: #991b1b; }

.recipe-card__proj-label .pi { font-size: 0.6875rem; }

.recipe-card__footer {
  margin-top: 0.75rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--ns-border-light);
}

.recipe-card__detail-btn {
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

.recipe-card__detail-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.recipe-card__detail-btn .pi { font-size: 0.8125rem; }

.recipe-card--unsafe {
  border-color: #fcd34d;
  background: #fffef5;
}

.recipe-card__unsafe-banner {
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
  margin-bottom: 0.5rem;
}

.recipe-card__unsafe-banner .pi {
  font-size: 0.75rem;
  color: #d97706;
  flex-shrink: 0;
}
</style>
