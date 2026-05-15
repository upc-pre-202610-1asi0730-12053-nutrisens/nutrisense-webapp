<!-- PATH: src/app/smart-recommendations/presentation/components/recipe-detail-dialog.component.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const props = defineProps({
  /** @type {import('vue').PropType<ReturnType<import('../../domain/model/recipe.entity.js').Recipe>|null>} */
  recipe: { type: Object, default: null },
  /** @type {import('vue').PropType<string[]>} */
  pantryIngredientIds: { type: Array, default: () => [] },
  /** @type {import('vue').PropType<ReturnType<import('../../domain/model/ingredient-catalog-item.entity.js').IngredientCatalogItem>[]>} */
  ingredientCatalog: { type: Array, default: () => [] },
  visible: { type: Boolean, required: true },
})

const emit = defineEmits(['update:visible', 'log'])

const { t } = useI18n()

const servings = ref(1)
/** @type {import('vue').Ref<'breakfast'|'lunch'|'snack'|'dinner'>} */
const selectedMealType = ref('lunch')

const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

watch(() => props.visible, open => {
  if (!open) return
  servings.value = 1
  selectedMealType.value = 'lunch'
})

/** @type {import('vue').ComputedRef<string[]>} */
const missingIds = computed(() =>
  props.recipe ? props.recipe.missingIngredients(props.pantryIngredientIds) : []
)

/** @type {import('vue').ComputedRef<boolean>} */
const allAvailable = computed(() => missingIds.value.length === 0)

/**
 * Each ingredient enriched with its catalog name and pantry status.
 * @type {import('vue').ComputedRef<Array<{id:string, name:string, quantity:number, unit:string, inPantry:boolean}>>}
 */
const enrichedIngredients = computed(() => {
  if (!props.recipe) return []
  return props.recipe.ingredients.map(ing => {
    const catalogItem = props.ingredientCatalog.find(c => c.id === ing.ingredientId)
    return {
      id: ing.ingredientId,
      name: catalogItem ? t(catalogItem.key) : ing.ingredientId,
      quantity: ing.quantity,
      unit: ing.unit,
      inPantry: props.pantryIngredientIds.includes(ing.ingredientId),
    }
  })
})

/**
 * Macros scaled to the selected servings count.
 * @type {import('vue').ComputedRef<{calories:number,proteinG:number,carbsG:number,fatG:number}>}
 */
const scaledMacros = computed(() => {
  if (!props.recipe) return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const m = props.recipe.totalMacros.scale(servings.value)
  return { calories: m.calories, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG }
})

function handleLog() {
  emit('log', { recipe: props.recipe, servings: servings.value, mealType: selectedMealType.value })
  emit('update:visible', false)
}
</script>

<template>
  <pv-dialog
    :visible="visible"
    :header="recipe ? t(recipe.key) : t('recommendations.recipeDetail')"
    :modal="true"
    :draggable="false"
    style="width:480px;max-width:95vw"
    @update:visible="val => emit('update:visible', val)"
  >
    <div v-if="recipe" class="rec-detail">

      <!-- Meta row -->
      <div class="rec-detail__meta">
        <span class="rec-detail__meta-item">
          <i class="pi pi-clock" aria-hidden="true" />
          {{ t('recommendations.prepTime', { n: recipe.prepTimeMinutes }) }}
        </span>
        <span class="rec-detail__meta-item">
          <i class="pi pi-users" aria-hidden="true" />
          {{ recipe.servings }}
        </span>
      </div>

      <!-- Macro preview (per serving, scaled) -->
      <div class="rec-detail__macros-wrap">
        <span class="rec-detail__section-label">
          {{ t('recommendations.macroPreview') }}
          <span class="rec-detail__per-serving">× {{ servings }}</span>
        </span>
        <div class="rec-detail__macros">
          <div class="rec-detail__macro">
            <span class="rec-detail__macro-val rec-detail__macro-val--cal">{{ Math.round(scaledMacros.calories) }}</span>
            <span class="rec-detail__macro-lbl">{{ t('macros.kcal') }}</span>
          </div>
          <div class="rec-detail__macro">
            <span class="rec-detail__macro-val rec-detail__macro-val--pro">{{ Math.round(scaledMacros.proteinG) }}g</span>
            <span class="rec-detail__macro-lbl">{{ t('macros.protein') }}</span>
          </div>
          <div class="rec-detail__macro">
            <span class="rec-detail__macro-val rec-detail__macro-val--carb">{{ Math.round(scaledMacros.carbsG) }}g</span>
            <span class="rec-detail__macro-lbl">{{ t('macros.carbs') }}</span>
          </div>
          <div class="rec-detail__macro">
            <span class="rec-detail__macro-val rec-detail__macro-val--fat">{{ Math.round(scaledMacros.fatG) }}g</span>
            <span class="rec-detail__macro-lbl">{{ t('macros.fat') }}</span>
          </div>
        </div>
      </div>

      <!-- Ingredient list -->
      <div class="rec-detail__ingredients-wrap">
        <div class="rec-detail__ingredients-header">
          <span class="rec-detail__section-label">{{ t('recommendations.ingredientsNeeded') }}</span>
          <pv-tag
            v-if="allAvailable"
            :value="t('recommendations.allAvailable')"
            severity="success"
            class="rec-detail__all-tag"
          />
          <pv-tag
            v-else
            :value="t('recommendations.missing', { n: missingIds.length })"
            severity="warn"
            class="rec-detail__all-tag"
          />
        </div>

        <ul class="rec-detail__ing-list" role="list">
          <li
            v-for="ing in enrichedIngredients"
            :key="ing.id"
            class="rec-detail__ing-item"
            :class="{ 'rec-detail__ing-item--missing': !ing.inPantry }"
          >
            <i
              class="pi rec-detail__ing-icon"
              :class="ing.inPantry ? 'pi-check-circle' : 'pi-times-circle'"
              :aria-label="ing.inPantry ? t('recommendations.inPantry') : t('recommendations.notInPantry')"
              aria-hidden="false"
            />
            <span class="rec-detail__ing-name">{{ ing.name }}</span>
            <span class="rec-detail__ing-qty">{{ formatNum(ing.quantity) }} {{ ing.unit }}</span>
          </li>
        </ul>
      </div>

      <!-- Cannot log warning -->
      <pv-message
        v-if="missingIds.length > 0"
        severity="warn"
        :closable="false"
        class="rec-detail__cannot-log"
      >
        {{ t('recommendations.cannotLogMissingIngredients') }}
      </pv-message>

      <pv-divider />

      <!-- Log controls -->
      <div class="rec-detail__log-controls">

        <!-- Servings -->
        <div class="rec-detail__field">
          <label class="rec-detail__section-label" for="rec-servings">{{ t('recommendations.servingsCount') }}</label>
          <div class="rec-detail__servings-row">
            <pv-input-number
              id="rec-servings"
              v-model="servings"
              :min="0.5"
              :max="10"
              :step="0.5"
              :aria-label="t('recommendations.servingsCount')"
              style="width:110px"
            />
          </div>
        </div>

        <!-- Meal type -->
        <div class="rec-detail__field">
          <span class="rec-detail__section-label">{{ t('recommendations.selectMealType') }}</span>
          <div class="rec-detail__meal-types" role="radiogroup" :aria-label="t('recommendations.selectMealType')">
            <button
              v-for="mt in mealTypes"
              :key="mt"
              class="rec-detail__meal-btn"
              :class="{ 'rec-detail__meal-btn--active': selectedMealType === mt }"
              role="radio"
              :aria-checked="selectedMealType === mt"
              @click="selectedMealType = mt"
            >
              {{ t('meal.' + mt) }}
            </button>
          </div>
        </div>

      </div>

    </div>

    <template #footer>
      <pv-button :label="t('common.cancel')" text @click="emit('update:visible', false)" />
      <pv-button
        :label="t('recommendations.logRecipe')"
        icon="pi pi-check"
        :disabled="missingIds.length > 0"
        @click="handleLog"
      />
    </template>
  </pv-dialog>
</template>

<style scoped>
.rec-detail {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding-top: 0.125rem;
}

.rec-detail__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.rec-detail__meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.rec-detail__meta-item .pi { font-size: 0.875rem; }

/* ── Section label ── */
.rec-detail__section-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rec-detail__per-serving {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-primary);
  font-size: 0.75rem;
}

/* ── Macros ── */
.rec-detail__macros-wrap { display: flex; flex-direction: column; gap: 0.5rem; }

.rec-detail__macros {
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.rec-detail__macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.rec-detail__macro-val { font-size: 1rem; font-weight: 700; color: var(--color-text); }

.rec-detail__macro-lbl {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #9ca3af);
  margin-top: 0.1rem;
}

/* ── Ingredients ── */
.rec-detail__ingredients-wrap { display: flex; flex-direction: column; gap: 0.5rem; }

.rec-detail__ingredients-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rec-detail__all-tag { font-size: 0.6875rem; }

.rec-detail__ing-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.rec-detail__ing-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid #f5f1ee;
  background: #fff;
}

.rec-detail__ing-item:last-child { border-bottom: none; }

.rec-detail__ing-item--missing { background: #fff8f7; }

.rec-detail__ing-icon {
  font-size: 0.9375rem;
  flex-shrink: 0;
}

.rec-detail__ing-item:not(.rec-detail__ing-item--missing) .rec-detail__ing-icon {
  color: #22c55e;
}

.rec-detail__ing-item--missing .rec-detail__ing-icon {
  color: #ef4444;
}

.rec-detail__ing-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.rec-detail__ing-qty {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.rec-detail__cannot-log { margin: 0; }

/* ── Log controls ── */
.rec-detail__log-controls {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.rec-detail__field { display: flex; flex-direction: column; gap: 0.5rem; }

.rec-detail__servings-row { display: flex; align-items: center; gap: 0.5rem; }

.rec-detail__meal-types {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.rec-detail__meal-btn {
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

.rec-detail__meal-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.rec-detail__meal-btn--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
</style>
