<!-- PATH: src/app/smart-recommendations/presentation/components/log-dish-dialog.component.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  /** @type {import('vue').PropType<ReturnType<import('../../domain/model/recommendation-card.entity.js').RecommendationCard>|null>} */
  recommendation: { type: Object, default: null },
  /**
   * Food entity from the nutrition catalog matching recommendation.foodId.
   * Null when not found or still loading.
   * @type {import('vue').PropType<ReturnType<import('../../../nutrition-tracking/domain/model/food.entity.js').Food>|null>}
   */
  food: { type: Object, default: null },
  visible: { type: Boolean, required: true },
})

const emit = defineEmits(['update:visible', 'confirm'])

const { t } = useI18n()

/** @type {import('vue').Ref<'breakfast'|'lunch'|'snack'|'dinner'>} */
const selectedMealType = ref('lunch')
const grams = ref(100)

const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

/** @type {import('vue').ComputedRef<string>} */
const dishName = computed(() => {
  if (!props.recommendation) return ''
  if (props.recommendation.foodId && props.food) return t(props.food.key)
  return props.recommendation.customFoodName ?? ''
})

/** @type {import('vue').ComputedRef<boolean>} */
const canLog = computed(() => !!props.recommendation)

/** Whether a matched food catalog entry is available for per-gram scaling. */
const hasFood = computed(() => !!props.recommendation?.foodId && !!props.food)

/**
 * Macros scaled to the current grams input.
 * Falls back to the recommendation's estimated values when the food entity is unavailable.
 * @type {import('vue').ComputedRef<{calories:number, proteinG:number, carbsG:number, fatG:number}>}
 */
const previewMacros = computed(() => {
  if (props.food && grams.value > 0) {
    const m = props.food.macrosForQuantity(grams.value)
    return { calories: m.calories, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG }
  }
  if (props.recommendation) {
    return {
      calories: props.recommendation.estimatedCalories,
      proteinG: props.recommendation.estimatedProteinG,
      carbsG: props.recommendation.estimatedCarbsG,
      fatG: props.recommendation.estimatedFatG,
    }
  }
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
})

watch(() => props.food, food => {
  if (food && food.servingSizeG > 0) grams.value = food.servingSizeG
  else grams.value = 100
})

watch(() => props.visible, open => {
  if (!open) return
  selectedMealType.value = 'lunch'
  if (props.food && props.food.servingSizeG > 0) grams.value = props.food.servingSizeG
  else grams.value = 100
})

function handleConfirm() {
  if (!canLog.value) return
  emit('confirm', {
    foodId: props.recommendation.foodId,
    grams: grams.value,
    mealType: selectedMealType.value,
    estimatedMacros: previewMacros.value,
  })
  emit('update:visible', false)
}
</script>

<template>
  <pv-dialog
    :visible="visible"
    :header="t('recommendations.logDish')"
    :modal="true"
    :draggable="false"
    style="width:420px;max-width:95vw"
    @update:visible="val => emit('update:visible', val)"
  >
    <div v-if="recommendation" class="log-dish">

      <!-- Dish name -->
      <div class="log-dish__name">{{ dishName }}</div>

      <!-- Portion (only when food catalog entry available for per-gram scaling) -->
      <div v-if="hasFood" class="log-dish__field">
        <label class="log-dish__label" for="log-dish-grams">{{ t('recommendations.portionG') }}</label>
        <div class="log-dish__grams-row">
          <pv-input-number
            id="log-dish-grams"
            v-model="grams"
            :min="1"
            :max="2000"
            :aria-label="t('recommendations.portionG')"
            class="log-dish__grams-input"
          />
          <span class="log-dish__unit">g</span>
        </div>
      </div>

      <!-- Macro preview -->
      <div class="log-dish__macros" :aria-label="t('recommendations.macroPreview')">
        <div class="log-dish__macro">
          <span class="log-dish__macro-val log-dish__macro-val--cal">{{ Math.round(previewMacros.calories) }}</span>
          <span class="log-dish__macro-lbl">{{ t('macros.kcal') }}</span>
        </div>
        <div class="log-dish__macro">
          <span class="log-dish__macro-val log-dish__macro-val--pro">{{ Math.round(previewMacros.proteinG) }}g</span>
          <span class="log-dish__macro-lbl">{{ t('macros.protein') }}</span>
        </div>
        <div class="log-dish__macro">
          <span class="log-dish__macro-val log-dish__macro-val--carb">{{ Math.round(previewMacros.carbsG) }}g</span>
          <span class="log-dish__macro-lbl">{{ t('macros.carbs') }}</span>
        </div>
        <div class="log-dish__macro">
          <span class="log-dish__macro-val log-dish__macro-val--fat">{{ Math.round(previewMacros.fatG) }}g</span>
          <span class="log-dish__macro-lbl">{{ t('macros.fat') }}</span>
        </div>
      </div>

      <!-- Meal type -->
      <div class="log-dish__field">
        <span class="log-dish__label">{{ t('recommendations.selectMealType') }}</span>
        <div class="log-dish__meal-types" role="radiogroup" :aria-label="t('recommendations.selectMealType')">
          <button
            v-for="mt in mealTypes"
            :key="mt"
            class="log-dish__meal-btn"
            :class="{ 'log-dish__meal-btn--active': selectedMealType === mt }"
            role="radio"
            :aria-checked="selectedMealType === mt"
            @click="selectedMealType = mt"
          >
            {{ t('meal.' + mt) }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <pv-button :label="t('common.cancel')" text @click="emit('update:visible', false)" />
      <pv-button
        :label="t('recommendations.logDish')"
        icon="pi pi-check"
        :disabled="!canLog"
        @click="handleConfirm"
      />
    </template>
  </pv-dialog>
</template>

<style scoped>
.log-dish {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding-top: 0.25rem;
}

.log-dish__name {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.log-dish__warn { margin: 0; }

.log-dish__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.log-dish__label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.log-dish__grams-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-dish__grams-input { width: 120px; }

.log-dish__unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.log-dish__macros {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.log-dish__macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.log-dish__macro-val {
  font-size: 1rem;
  font-weight: 700;
}

.log-dish__macro-val--cal,
.log-dish__macro-val--pro,
.log-dish__macro-val--carb,
.log-dish__macro-val--fat  { color: var(--color-text); }

.log-dish__macro-lbl {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #9ca3af);
  margin-top: 0.1rem;
}

.log-dish__meal-types {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.log-dish__meal-btn {
  padding: 0.35rem 0.875rem;
  border-radius: 99px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.log-dish__meal-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.log-dish__meal-btn--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
</style>
