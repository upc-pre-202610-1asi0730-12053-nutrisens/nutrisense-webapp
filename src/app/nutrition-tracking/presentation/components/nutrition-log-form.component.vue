<!-- PATH: src/app/nutrition-tracking/presentation/components/nutrition-log-form.component.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  foods: { type: Array, required: true },
  mealType: { type: String, required: true },
  visible: { type: Boolean, default: false },
  conflictFlags: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'cancel', 'search'])

const { t } = useI18n()

const searchQuery = ref('')
const selectedFood = ref(null)
const quantityG = ref(100)
/** @type {import('vue').Ref<string>} */
const quantityError = ref('')

const mealTypeOptions = [
  { label: t('nutrition.breakfast'), value: 'breakfast' },
  { label: t('nutrition.lunch'),     value: 'lunch' },
  { label: t('nutrition.snack'),     value: 'snack' },
  { label: t('nutrition.dinner'),    value: 'dinner' },
]

const selectedMealType = ref(props.mealType)

const preview = computed(() => {
  if (!selectedFood.value || !quantityG.value) return null
  const f = selectedFood.value
  const ratio = quantityG.value / 100
  return {
    calories: Math.round(f.caloriesPer100g * ratio),
    proteinG: Math.round(f.proteinPer100g * ratio * 10) / 10,
    carbsG:   Math.round(f.carbsPer100g   * ratio * 10) / 10,
    fatG:     Math.round(f.fatPer100g     * ratio * 10) / 10,
  }
})

function onSearch() {
  emit('search', searchQuery.value)
}

function selectFood(food) {
  selectedFood.value = food
  searchQuery.value = t(food.key)
}

function handleSubmit() {
  if (!selectedFood.value) return
  quantityError.value = ''
  const q = quantityG.value
  if (!q || q < 1 || q > 2000) {
    quantityError.value = t('nutrition.errorQuantityRange')
    return
  }
  emit('submit', {
    foodId: selectedFood.value.id,
    grams: q,
    mealType: selectedMealType.value,
  })
  reset()
}

function reset() {
  searchQuery.value = ''
  selectedFood.value = null
  quantityG.value = 100
  quantityError.value = ''
}

function handleCancel() {
  reset()
  emit('cancel')
}
</script>

<template>
  <pv-dialog
    :visible="visible"
    :header="t('nutrition.addFood')"
    :modal="true"
    :closable="true"
    :draggable="false"
    style="width: 480px; max-width: 95vw;"
    @update:visible="val => !val && handleCancel()"
  >
    <div class="log-form">
      <div class="log-form__field">
        <label for="food-search" class="log-form__label">{{ t('nutrition.searchFood').replace('...', '') }}</label>
        <pv-input-text
          id="food-search"
          v-model="searchQuery"
          :placeholder="t('nutrition.searchFood')"
          :aria-label="t('nutrition.searchFood')"
          class="w-full"
          @input="onSearch"
        />
      </div>

      <div v-if="foods.length && !selectedFood" class="food-results" role="listbox" :aria-label="t('nutrition.searchFood')">
        <div
          v-for="food in foods"
          :key="food.id"
          class="food-result-item"
          role="option"
          tabindex="0"
          @click="selectFood(food)"
          @keydown.enter="selectFood(food)"
        >
          <span>{{ t(food.key) }}</span>
          <span class="food-result-item__cal">{{ food.caloriesPer100g }} kcal/100g</span>
        </div>
      </div>

      <div v-if="selectedFood && conflictFlags.length" class="log-form__restriction-warn" role="alert" aria-live="assertive">
        <i class="pi pi-exclamation-triangle" aria-hidden="true" />
        {{ t('nutrition.restrictionWarning') }}
      </div>

      <div v-if="selectedFood" class="log-form__field">
        <label for="food-qty" class="log-form__label">{{ t('nutrition.quantity') }}</label>
        <pv-input-number
          id="food-qty"
          v-model="quantityG"
          :min="1"
          :max="2000"
          :aria-label="t('nutrition.quantity')"
          :aria-describedby="quantityError ? 'food-qty-error' : undefined"
          :invalid="!!quantityError"
          class="w-full"
          suffix="g"
          @update:model-value="quantityError = ''"
        />
        <small
          v-if="quantityError"
          id="food-qty-error"
          class="log-form__error"
          role="alert"
          aria-live="assertive"
        >
          {{ quantityError }}
        </small>
      </div>

      <div v-if="selectedFood" class="log-form__field">
        <label for="meal-type-select" class="log-form__label">{{ t('nutrition.mealType') }}</label>
        <pv-dropdown
          id="meal-type-select"
          v-model="selectedMealType"
          :options="mealTypeOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('nutrition.mealType')"
          class="w-full"
        />
      </div>

      <div v-if="preview" class="log-form__preview">
        <div class="preview-macro">
          <span class="preview-macro__val preview-macro__val--cal">{{ preview.calories }}</span>
          <span class="preview-macro__lbl">kcal</span>
        </div>
        <div class="preview-macro">
          <span class="preview-macro__val preview-macro__val--pro">{{ preview.proteinG }}g</span>
          <span class="preview-macro__lbl">P</span>
        </div>
        <div class="preview-macro">
          <span class="preview-macro__val preview-macro__val--carb">{{ preview.carbsG }}g</span>
          <span class="preview-macro__lbl">C</span>
        </div>
        <div class="preview-macro">
          <span class="preview-macro__val preview-macro__val--fat">{{ preview.fatG }}g</span>
          <span class="preview-macro__lbl">F</span>
        </div>
      </div>
    </div>

    <template #footer>
      <pv-button
        :label="t('nutrition.cancel')"
        text
        @click="handleCancel"
      />
      <pv-button
        :label="t('nutrition.add')"
        :disabled="!selectedFood"
        @click="handleSubmit"
      />
    </template>
  </pv-dialog>
</template>

<style scoped>
.log-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.log-form__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
}

.food-results {
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-sm);
  max-height: 200px;
  overflow-y: auto;
}

.food-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.875rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background var(--ns-transition);
}

.food-result-item:hover,
.food-result-item:focus {
  background: var(--ns-surface-alt);
  outline: none;
}

.food-result-item__cal {
  font-size: 0.75rem;
  color: var(--ns-text-muted);
}

.log-form__preview {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--ns-surface-alt);
  border-radius: var(--ns-radius-sm);
  justify-content: center;
}

.preview-macro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.preview-macro__val {
  font-size: 1rem;
  font-weight: 700;
}

.preview-macro__val--cal  { color: var(--ns-accent); }
.preview-macro__val--pro  { color: var(--ns-protein-color); }
.preview-macro__val--carb { color: var(--ns-carbs-color); }
.preview-macro__val--fat  { color: var(--ns-fat-color); }

.preview-macro__lbl {
  font-size: 0.6875rem;
  color: var(--ns-text-muted);
}

.log-form__error {
  font-size: 0.75rem;
  color: var(--color-danger, #ef4444);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.log-form__restriction-warn {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: #92400e;
  line-height: 1.4;
}

.log-form__restriction-warn .pi {
  font-size: 0.875rem;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 1px;
}
</style>