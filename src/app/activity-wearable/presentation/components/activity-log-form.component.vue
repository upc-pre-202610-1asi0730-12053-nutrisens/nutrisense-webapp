<!-- PATH: src/app/activity-wearable/presentation/components/activity-log-form.component.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ActivityType } from '../../domain/model/activity-type.record.js'

defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'cancel'])
const { t } = useI18n()

/** @type {{ value: string, icon: string }[]} */
const activityOptions = [
  { value: 'walking',           icon: 'pi-compass'   },
  { value: 'running',           icon: 'pi-bolt'      },
  { value: 'cycling',           icon: 'pi-replay'    },
  { value: 'swimming',          icon: 'pi-refresh'   },
  { value: 'strength-training', icon: 'pi-chart-bar' },
  { value: 'hiit',              icon: 'pi-asterisk'  },
  { value: 'yoga',              icon: 'pi-sun'       },
  { value: 'cardio',            icon: 'pi-heart'     },
]

const intensityOptions = ['low', 'medium', 'high'].map(v => ({
  label: t(`intensity.${v}`), value: v,
}))

const activityType = ref('walking')
const intensity = ref('medium')
const durationMinutes = ref(30)
/** @type {import('vue').Ref<string>} */
const durationError = ref('')

/** @type {import('vue').ComputedRef<number>} */
const estimatedCalories = computed(() =>
  ActivityType(activityType.value).estimateCalories(intensity.value, durationMinutes.value)
)

function handleSubmit() {
  durationError.value = ''
  const d = durationMinutes.value
  if (!d || d < 1 || d > 480) {
    durationError.value = t('activity.errorDurationRange')
    return
  }
  emit('submit', {
    activityType: activityType.value,
    intensity: intensity.value,
    durationMinutes: d,
    caloriesBurned: estimatedCalories.value,
  })
  reset()
}

function reset() {
  activityType.value = 'walking'
  intensity.value = 'medium'
  durationMinutes.value = 30
  durationError.value = ''
}

function handleCancel() {
  reset()
  emit('cancel')
}
</script>

<template>
  <pv-dialog
    :visible="visible"
    :header="t('activity.logActivity')"
    :modal="true"
    :draggable="false"
    style="width: 520px; max-width: 96vw;"
    @update:visible="val => !val && handleCancel()"
  >
    <div class="activity-form">
      <div class="activity-form__field">
        <span class="activity-form__label">{{ t('activity.activityType') }}</span>
        <div class="activity-type-grid" role="radiogroup" :aria-label="t('activity.activityType')">
          <button
            v-for="opt in activityOptions"
            :key="opt.value"
            type="button"
            class="activity-type-card"
            :class="{ 'activity-type-card--selected': activityType === opt.value }"
            :aria-checked="activityType === opt.value"
            role="radio"
            @click="activityType = opt.value"
          >
            <i :class="`pi ${opt.icon} activity-type-card__icon`" aria-hidden="true" />
            <span class="activity-type-card__label">{{ t(`activityType.${opt.value}`) }}</span>
          </button>
        </div>
      </div>

      <div class="activity-form__row">
        <div class="activity-form__field">
          <label for="act-duration" class="activity-form__label">{{ t('activity.duration') }}</label>
          <pv-input-number
            id="act-duration"
            v-model="durationMinutes"
            :min="1"
            :max="480"
            :aria-label="t('activity.duration')"
            :aria-describedby="durationError ? 'act-duration-error' : undefined"
            :invalid="!!durationError"
            class="w-full"
            suffix=" min"
            @update:model-value="durationError = ''"
          />
          <small
            v-if="durationError"
            id="act-duration-error"
            class="activity-form__error"
            role="alert"
            aria-live="assertive"
          >
            {{ durationError }}
          </small>
        </div>
        <div class="activity-form__field">
          <label for="act-intensity" class="activity-form__label">{{ t('activity.intensity') }}</label>
          <pv-select-button
            id="act-intensity"
            v-model="intensity"
            :options="intensityOptions"
            option-label="label"
            option-value="value"
            :aria-label="t('activity.intensity')"
            class="intensity-selector"
          />
        </div>
      </div>

      <div class="calories-display" aria-live="polite">
        <i class="pi pi-bolt calories-display__icon" aria-hidden="true" />
        <span class="calories-display__value">{{ t('activity.estimatedCalories', { n: estimatedCalories }) }}</span>
      </div>
    </div>

    <template #footer>
      <pv-button :label="t('activity.cancel')" text @click="handleCancel" />
      <pv-button :label="t('activity.add')" @click="handleSubmit" />
    </template>
  </pv-dialog>
</template>

<style scoped>
.activity-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.activity-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-form__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
}

.activity-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: end;
}

/* Activity type grid */
.activity-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.activity-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.625rem 0.25rem;
  border-radius: 8px;
  border: 1.5px solid var(--p-content-border-color, #e2e8f0);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  color: var(--ns-text-secondary, #64748b);
}

.activity-type-card:hover {
  border-color: var(--p-primary-color, #10b981);
  background: var(--p-primary-50, #f0fdf4);
  color: var(--p-primary-color, #10b981);
}

.activity-type-card--selected {
  border-color: var(--p-primary-color, #10b981);
  background: var(--p-primary-50, #f0fdf4);
  color: var(--p-primary-color, #10b981);
}

.activity-type-card__icon {
  font-size: 1.25rem;
}

.activity-type-card__label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

/* Estimated calories */
.calories-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--p-primary-50, #f0fdf4);
  border: 1px solid var(--p-primary-200, #a7f3d0);
}

.calories-display__icon {
  font-size: 1rem;
  color: var(--p-primary-color, #10b981);
}

.calories-display__value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-primary-700, #047857);
}

.intensity-selector :deep(.p-selectbutton) {
  width: 100%;
}

.activity-form__error {
  font-size: 0.75rem;
  color: var(--p-red-500, #ef4444);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.125rem;
}
</style>
