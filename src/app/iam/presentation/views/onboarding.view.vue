<!-- PATH: src/app/iam/presentation/views/onboarding.view.vue -->
<script setup>
import { ref, computed, toRefs, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'
import { useBodyHealthMetricsStore } from '../../../body-health-metrics/application/body-health-metrics.store.js'
import { Height } from '../../domain/model/height.record.js'
import { DateOfBirth } from '../../domain/model/date-of-birth.record.js'
import { WaistMeasurement } from '../../domain/model/waist-measurement.record.js'

const { t } = useI18n()
const router = useRouter()
const iamStore = useIamStore()
const bodyMetricsStore = useBodyHealthMetricsStore()
const { userLoaded, errors } = toRefs(iamStore)

const userId = localStorage.getItem('ns_user_id') ?? ''

iamStore.fetchCurrentUser(userId)

const TOTAL_STEPS = 4
const step = ref(1)
const loading = ref(false)

const DIETARY_RESTRICTIONS = ['lactose-free', 'gluten-free', 'vegan', 'vegetarian', 'nut-free', 'seafood-free', 'kosher', 'halal']
const MEDICAL_CONDITIONS = ['type-2-diabetes', 'high-blood-pressure', 'coeliac-disease', 'hypothyroidism', 'kidney-disease', 'gout']

const form = ref({
  biologicalSex: 'prefer-not-to-say',
  dateOfBirth: '',
  heightCm: 170,
  goal: 'weight-loss',
  activityLevel: 'moderately-active',
  weightKg: 70,
  waistMethod: 'exact',
  waistExactCm: 80,
  waistPantsSize: 32,
  waistVisual: 'normal',
  homeCityId: '',
  dietaryRestrictions: /** @type {string[]} */ ([]),
  medicalConditions: /** @type {string[]} */ ([]),
})

/** @type {import('vue').ComputedRef<number>} */
const resolvedWaistCm = computed(() => {
  const { waistMethod, waistExactCm, waistPantsSize, waistVisual } = form.value
  const value = waistMethod === 'exact' ? waistExactCm
    : waistMethod === 'pants' ? waistPantsSize
    : waistVisual
  return WaistMeasurement(waistMethod, value)
})

const stepTitle = computed(() => t(`onboarding.step${step.value}Title`))
const stepSubtitle = computed(() => t(`onboarding.step${step.value}Subtitle`))

// --- Validation ---
const step1Touched = ref(false)
const step3Touched = ref(false)

/** @type {import('vue').ComputedRef<Record<string,string>>} */
const step1FieldErrors = computed(() => {
  const errs = /** @type {Record<string,string>} */ ({})

  const dobError = DateOfBirth.validate(form.value.dateOfBirth)
  if (dobError === 'required') errs.dateOfBirth = t('validation.dateRequired')
  else if (dobError === 'future') errs.dateOfBirth = t('validation.dateInFuture')
  else if (dobError === 'tooYoung') errs.dateOfBirth = t('validation.ageTooYoung')
  else if (dobError) errs.dateOfBirth = t('validation.dateRequired')

  if (!Height.isValid(form.value.heightCm)) {
    errs.heightCm = t('validation.heightRange')
  }
  return errs
})

/** @type {import('vue').ComputedRef<Record<string,string>>} */
const step3FieldErrors = computed(() => {
  const errs = /** @type {Record<string,string>} */ ({})
  if (form.value.weightKg < 30 || form.value.weightKg > 300) {
    errs.weightKg = t('validation.weightRange')
  }
  if (!form.value.homeCityId) {
    errs.homeCityId = t('validation.cityRequired')
  }
  return errs
})

const step1Valid = computed(() => Object.keys(step1FieldErrors.value).length === 0)
const step3Valid = computed(() => Object.keys(step3FieldErrors.value).length === 0)

// --- City searchable picker ---
const citySearch = ref('')
const cityOpen = ref(false)
const cityInputRef = ref(/** @type {HTMLInputElement|null} */ (null))

const cityOptions = [
  { label: t('city.lima'),         value: 'city_lima' },
  { label: t('city.bogota'),       value: 'city_bogota' },
  { label: t('city.cdmx'),         value: 'city_cdmx' },
  { label: t('city.buenos_aires'), value: 'city_buenos_aires' },
  { label: t('city.miami'),        value: 'city_miami' },
  { label: t('city.madrid'),       value: 'city_madrid' },
  { label: t('city.new_york'),     value: 'city_new_york' },
  { label: t('city.barcelona'),    value: 'city_barcelona' },
]

/** @type {import('vue').ComputedRef<string>} */
const selectedCityLabel = computed(() => cityOptions.find(c => c.value === form.value.homeCityId)?.label ?? '')

/** @type {import('vue').ComputedRef<typeof cityOptions>} */
const filteredCities = computed(() => {
  const q = citySearch.value.toLowerCase().trim()
  if (!q) return cityOptions
  return cityOptions.filter(c => c.label.toLowerCase().includes(q))
})

/** Opens the city search input. */
function openCityPicker() {
  cityOpen.value = true
  nextTick(() => cityInputRef.value?.focus())
}

/**
 * Selects a city and closes the dropdown.
 * @param {{ label: string, value: string }} city
 */
function selectCity(city) {
  form.value.homeCityId = city.value
  citySearch.value = ''
  cityOpen.value = false
}

/** Clears the selected city and reopens the picker. */
function clearCity() {
  form.value.homeCityId = ''
  citySearch.value = ''
  cityOpen.value = true
  nextTick(() => cityInputRef.value?.focus())
}

function handleCityBlur() {
  setTimeout(() => { cityOpen.value = false }, 150)
}

// --- Form options ---
const sexOptions = [
  { label: t('onboarding.sexMale'),      value: 'male' },
  { label: t('onboarding.sexFemale'),    value: 'female' },
  { label: t('onboarding.sexPreferNot'), value: 'prefer-not-to-say' },
]

const goalOptions = [
  { label: t('onboarding.goalWeightLoss'), value: 'weight-loss' },
  { label: t('onboarding.goalMuscleGain'), value: 'muscle-gain' },
]

const activityOptions = [
  { label: t('onboarding.activitySedentary'),  value: 'sedentary' },
  { label: t('onboarding.activityLightly'),    value: 'lightly-active' },
  { label: t('onboarding.activityModerately'), value: 'moderately-active' },
  { label: t('onboarding.activityVery'),       value: 'very-active' },
  { label: t('onboarding.activityExtra'),      value: 'extra-active' },
]

const waistMethodOptions = [
  { label: t('onboarding.waistMethodExact'),  value: 'exact' },
  { label: t('onboarding.waistMethodPants'),  value: 'pants' },
  { label: t('onboarding.waistMethodVisual'), value: 'visual' },
]

const pantsSizeOptions = [26, 28, 30, 32, 34, 36].map(n => ({ label: String(n), value: n }))

const visualOptions = [
  { label: t('onboarding.waistSlim'),   approx: t('onboarding.waistSlimApprox'),   value: 'slim' },
  { label: t('onboarding.waistNormal'), approx: t('onboarding.waistNormalApprox'), value: 'normal' },
  { label: t('onboarding.waistWide'),   approx: t('onboarding.waistWideApprox'),   value: 'wide' },
]

const waistContextKey = computed(() =>
  form.value.goal === 'muscle-gain'
    ? 'onboarding.waistContextMuscleGain'
    : 'onboarding.waistContextWeightLoss'
)

/**
 * Toggles a dietary restriction selection.
 * @param {string} r
 */
function toggleRestriction(r) {
  const idx = form.value.dietaryRestrictions.indexOf(r)
  if (idx === -1) form.value.dietaryRestrictions.push(r)
  else form.value.dietaryRestrictions.splice(idx, 1)
}

/**
 * Toggles a medical condition selection.
 * @param {string} c
 */
function toggleCondition(c) {
  const idx = form.value.medicalConditions.indexOf(c)
  if (idx === -1) form.value.medicalConditions.push(c)
  else form.value.medicalConditions.splice(idx, 1)
}

function nextStep() {
  if (step.value === 1) {
    step1Touched.value = true
    if (!step1Valid.value) return
  }
  if (step.value === 3) {
    step3Touched.value = true
    if (!step3Valid.value) return
  }
  if (step.value < TOTAL_STEPS) step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

/** Saves all onboarding data and navigates to plan selection. */
function handleSubmit() {
  loading.value = true

  const user = iamStore.currentUser
  iamStore.updateProfile({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email.value,
    biologicalSex: form.value.biologicalSex,
    dateOfBirth: form.value.dateOfBirth,
    heightCm: form.value.heightCm,
    goal: form.value.goal,
    activityLevel: form.value.activityLevel,
    preferredUnits: user.preferredUnits.value,
    preferredLanguage: user.preferredLanguage,
    plan: user.plan.value,
    homeCityId: form.value.homeCityId,
    createdAt: user.createdAt,
    medicalConditions: form.value.medicalConditions,
  })

  if (form.value.dietaryRestrictions.length > 0) {
    iamStore.updateDietaryRestrictions(form.value.dietaryRestrictions)
  }

  bodyMetricsStore.setUserHeight(form.value.heightCm)
  bodyMetricsStore.logWeight(userId, form.value.weightKg, new Date())
  bodyMetricsStore.createBodyMeasurement(userId, resolvedWaistCm.value)

  router.push({ name: 'plan-selection' })
}
</script>

<template>
  <div class="onboarding-page" role="main">
    <div class="onboarding-card">
      <header class="auth-topbar">
        <LanguageSwitcher variant="light" />
      </header>
      <div class="onboarding-card__brand">NutriSense</div>

      <div class="onboarding-card__progress" role="progressbar" :aria-valuenow="step" :aria-valuemax="TOTAL_STEPS">
        <div
          v-for="n in TOTAL_STEPS"
          :key="n"
          class="progress-dot"
          :class="{ 'progress-dot--active': n === step, 'progress-dot--done': n < step }"
        />
      </div>
      <p class="onboarding-card__step-label">{{ t('onboarding.stepOf', { current: step, total: TOTAL_STEPS }) }}</p>

      <pv-skeleton v-if="!userLoaded" height="360px" border-radius="12px" />
      <div v-if="errors.length" class="onboarding-error">{{ t('common.error') }}</div>

      <template v-if="userLoaded">
        <h1 class="onboarding-card__title">{{ stepTitle }}</h1>
        <p class="onboarding-card__subtitle">{{ stepSubtitle }}</p>

        <!-- Step 1: Body info -->
        <form v-if="step === 1" class="onboarding-form" novalidate @submit.prevent="nextStep">
          <div class="onboarding-form__field">
            <label class="onboarding-form__label">{{ t('onboarding.biologicalSex') }}</label>
            <pv-select-button
              v-model="form.biologicalSex"
              :options="sexOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('onboarding.biologicalSex')"
              class="w-full"
            />
          </div>

          <div class="onboarding-form__field">
            <label for="ob-dob" class="onboarding-form__label">{{ t('onboarding.dateOfBirth') }}</label>
            <pv-input-text
              id="ob-dob"
              v-model="form.dateOfBirth"
              type="date"
              :aria-label="t('onboarding.dateOfBirth')"
              class="w-full"
              :class="{ 'p-invalid': step1Touched && step1FieldErrors.dateOfBirth }"
            />
            <span v-if="step1Touched && step1FieldErrors.dateOfBirth" class="field-error">
              {{ step1FieldErrors.dateOfBirth }}
            </span>
          </div>

          <div class="onboarding-form__field">
            <label for="ob-height" class="onboarding-form__label">{{ t('onboarding.height') }}</label>
            <pv-input-number
              id="ob-height"
              v-model="form.heightCm"
              :min="100"
              :max="250"
              suffix=" cm"
              :aria-label="t('onboarding.height')"
              class="w-full"
              :invalid="step1Touched && !!step1FieldErrors.heightCm"
            />
            <span v-if="step1Touched && step1FieldErrors.heightCm" class="field-error">
              {{ step1FieldErrors.heightCm }}
            </span>
          </div>

          <div class="onboarding-form__actions">
            <pv-button type="submit" :label="t('onboarding.next')" class="w-full" />
          </div>
        </form>

        <!-- Step 2: Goals -->
        <form v-if="step === 2" class="onboarding-form" novalidate @submit.prevent="nextStep">
          <div class="onboarding-form__field">
            <label class="onboarding-form__label">{{ t('onboarding.goal') }}</label>
            <pv-select-button
              v-model="form.goal"
              :options="goalOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('onboarding.goal')"
              class="w-full"
            />
          </div>

          <div class="onboarding-form__field">
            <label for="ob-activity" class="onboarding-form__label">{{ t('onboarding.activityLevel') }}</label>
            <pv-select
              id="ob-activity"
              v-model="form.activityLevel"
              :options="activityOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('onboarding.activityLevel')"
              class="w-full"
            />
          </div>

          <div class="onboarding-form__actions onboarding-form__actions--split">
            <pv-button
              type="button"
              :label="t('onboarding.back')"
              severity="secondary"
              outlined
              @click="prevStep"
            />
            <pv-button type="submit" :label="t('onboarding.next')" class="flex-1" />
          </div>
        </form>

        <!-- Step 3: Measurements & location -->
        <form v-if="step === 3" class="onboarding-form" novalidate @submit.prevent="nextStep">
          <div class="onboarding-form__field">
            <label for="ob-weight" class="onboarding-form__label">{{ t('onboarding.weight') }}</label>
            <pv-input-number
              id="ob-weight"
              v-model="form.weightKg"
              :min="30"
              :max="300"
              :max-fraction-digits="1"
              suffix=" kg"
              :aria-label="t('onboarding.weight')"
              class="w-full"
              :invalid="step3Touched && !!step3FieldErrors.weightKg"
            />
            <span v-if="step3Touched && step3FieldErrors.weightKg" class="field-error">
              {{ step3FieldErrors.weightKg }}
            </span>
          </div>

          <div class="onboarding-form__field">
            <div class="onboarding-form__label-row">
              <label class="onboarding-form__label">{{ t('onboarding.waist') }}</label>
              <span class="onboarding-form__hint">{{ t(waistContextKey) }}</span>
            </div>

            <pv-select-button
              v-model="form.waistMethod"
              :options="waistMethodOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('onboarding.waistMethod')"
              class="w-full mb-2"
            />

            <pv-input-number
              v-if="form.waistMethod === 'exact'"
              v-model="form.waistExactCm"
              :min="50"
              :max="150"
              suffix=" cm"
              :aria-label="t('onboarding.waistMethodExact')"
              class="w-full"
            />

            <pv-select-button
              v-if="form.waistMethod === 'pants'"
              v-model="form.waistPantsSize"
              :options="pantsSizeOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('onboarding.waistMethodPants')"
              class="w-full"
            />

            <div v-if="form.waistMethod === 'visual'" class="visual-options">
              <button
                v-for="opt in visualOptions"
                :key="opt.value"
                type="button"
                class="visual-option"
                :class="{ 'visual-option--selected': form.waistVisual === opt.value }"
                :aria-pressed="form.waistVisual === opt.value"
                @click="form.waistVisual = opt.value"
              >
                <span class="visual-option__label">{{ opt.label }}</span>
                <span class="visual-option__approx">{{ opt.approx }}</span>
              </button>
            </div>
          </div>

          <div class="onboarding-form__field">
            <label class="onboarding-form__label">{{ t('onboarding.homeCity') }}</label>
            <div
              class="city-picker"
              :class="{
                'city-picker--open': cityOpen,
                'city-picker--error': step3Touched && step3FieldErrors.homeCityId,
              }"
            >
              <div
                v-if="form.homeCityId && !cityOpen"
                class="city-picker__selected"
                @click="openCityPicker"
              >
                <i class="pi pi-map-marker city-picker__pin" aria-hidden="true" />
                <span class="city-picker__selected-label">{{ selectedCityLabel }}</span>
                <button
                  type="button"
                  class="city-picker__clear-btn"
                  :aria-label="t('common.clear')"
                  @click.stop="clearCity"
                >
                  <i class="pi pi-times" aria-hidden="true" />
                </button>
              </div>
              <div v-else class="city-picker__search-wrap">
                <i class="pi pi-search city-picker__search-icon" aria-hidden="true" />
                <input
                  ref="cityInputRef"
                  v-model="citySearch"
                  class="city-picker__search"
                  :placeholder="t('onboarding.searchCity')"
                  @focus="cityOpen = true"
                  @blur="handleCityBlur"
                />
              </div>
              <ul v-if="cityOpen" class="city-picker__list" role="listbox">
                <li v-if="!filteredCities.length" class="city-picker__empty">
                  {{ t('onboarding.noCity') }}
                </li>
                <li
                  v-for="city in filteredCities"
                  :key="city.value"
                  class="city-picker__item"
                  :class="{ 'city-picker__item--selected': form.homeCityId === city.value }"
                  role="option"
                  :aria-selected="form.homeCityId === city.value"
                  @mousedown.prevent="selectCity(city)"
                >
                  <i
                    v-if="form.homeCityId === city.value"
                    class="pi pi-check city-picker__item-check"
                    aria-hidden="true"
                  />
                  <span>{{ city.label }}</span>
                </li>
              </ul>
            </div>
            <span v-if="step3Touched && step3FieldErrors.homeCityId" class="field-error">
              {{ step3FieldErrors.homeCityId }}
            </span>
          </div>

          <div class="onboarding-form__actions onboarding-form__actions--split">
            <pv-button
              type="button"
              :label="t('onboarding.back')"
              severity="secondary"
              outlined
              @click="prevStep"
            />
            <pv-button type="submit" :label="t('onboarding.next')" class="flex-1" />
          </div>
        </form>

        <!-- Step 4: Health profile — dietary restrictions + medical conditions -->
        <form v-if="step === 4" class="onboarding-form" novalidate @submit.prevent="handleSubmit">
          <div class="onboarding-form__field">
            <div class="restrictions-group-label">{{ t('onboarding.dietaryRestrictions') }}</div>
            <div class="restrictions-grid">
              <button
                v-for="r in DIETARY_RESTRICTIONS"
                :key="r"
                type="button"
                class="restriction-chip"
                :class="{ 'restriction-chip--selected': form.dietaryRestrictions.includes(r) }"
                :aria-pressed="form.dietaryRestrictions.includes(r)"
                @click="toggleRestriction(r)"
              >
                {{ t('restriction.' + r) }}
              </button>
            </div>
          </div>

          <div class="onboarding-form__field">
            <div class="restrictions-group-label">{{ t('onboarding.medicalConditions') }}</div>
            <div class="restrictions-grid">
              <button
                v-for="c in MEDICAL_CONDITIONS"
                :key="c"
                type="button"
                class="restriction-chip"
                :class="{ 'restriction-chip--selected': form.medicalConditions.includes(c) }"
                :aria-pressed="form.medicalConditions.includes(c)"
                @click="toggleCondition(c)"
              >
                {{ t('condition.' + c) }}
              </button>
            </div>
          </div>

          <p class="restrictions-hint">{{ t('onboarding.restrictionsOptional') }}</p>

          <div class="onboarding-form__actions onboarding-form__actions--split">
            <pv-button
              type="button"
              :label="t('onboarding.back')"
              severity="secondary"
              outlined
              @click="prevStep"
            />
            <pv-button
              type="submit"
              :label="t('onboarding.submit')"
              :loading="loading"
              class="flex-1"
            />
          </div>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-topbar {
  position: absolute;
  top: 0.875rem;
  right: 1rem;
}

.onboarding-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 1.5rem;
}

.onboarding-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.onboarding-card__brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-primary);
  margin-bottom: 1.25rem;
  text-align: center;
  letter-spacing: -0.01em;
}

.onboarding-card__progress {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e7eb;
  transition: background 0.2s;
}
.progress-dot--active { background: var(--ns-primary); }
.progress-dot--done   { background: var(--ns-primary); opacity: 0.4; }

.onboarding-card__step-label {
  font-size: 0.75rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 0 0 1.25rem;
}

.onboarding-card__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.25rem;
  text-align: center;
}

.onboarding-card__subtitle {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 0 0 1.75rem;
}

.onboarding-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.onboarding-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.onboarding-form__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
}

.onboarding-form__label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.125rem;
}

.onboarding-form__hint {
  font-size: 0.75rem;
  color: var(--ns-text-secondary);
  font-style: italic;
}

.onboarding-form__actions {
  margin-top: 0.25rem;
}

.onboarding-form__actions--split {
  display: flex;
  gap: 0.75rem;
}

.field-error {
  font-size: 0.75rem;
  color: var(--p-red-500);
  margin-top: 0.125rem;
}

/* ---- Visual waist options ---- */
.visual-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.visual-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.visual-option:hover {
  border-color: var(--ns-primary);
}

.visual-option--selected {
  border-color: var(--ns-primary);
  background: color-mix(in srgb, var(--ns-primary) 8%, white);
}

.visual-option__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ns-text);
}

.visual-option__approx {
  font-size: 0.75rem;
  color: var(--ns-text-secondary);
}

/* ---- City searchable picker ---- */
.city-picker {
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.city-picker--open {
  border-color: var(--ns-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ns-primary) 18%, transparent);
}

.city-picker--error {
  border-color: var(--p-red-500);
}

.city-picker__selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  min-height: 2.5rem;
}

.city-picker__pin {
  color: var(--ns-primary);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.city-picker__selected-label {
  flex: 1;
  font-size: 0.875rem;
  color: var(--ns-text);
}

.city-picker__clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0.125rem;
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  border-radius: 4px;
  transition: color 0.15s;
}

.city-picker__clear-btn:hover {
  color: var(--ns-text);
}

.city-picker__search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 2.5rem;
}

.city-picker__search-icon {
  color: #9ca3af;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.city-picker__search {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--ns-text);
  background: transparent;
}

.city-picker__search::placeholder {
  color: #9ca3af;
}

.city-picker__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
}

.city-picker__empty {
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: var(--ns-text-secondary);
}

.city-picker__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  color: var(--ns-text);
  cursor: pointer;
  transition: background 0.1s;
}

.city-picker__item:hover {
  background: #f9fafb;
}

.city-picker__item--selected {
  background: color-mix(in srgb, var(--ns-primary) 6%, white);
  color: var(--ns-primary);
  font-weight: 500;
}

.city-picker__item-check {
  font-size: 0.75rem;
  color: var(--ns-primary);
}

/* ---- Restrictions & conditions (step 4) ---- */
.restrictions-group-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-text);
  margin-bottom: 0.5rem;
}

.restrictions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.restriction-chip {
  padding: 0.375rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  font-size: 0.8125rem;
  color: var(--ns-text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  white-space: nowrap;
}

.restriction-chip:hover {
  border-color: var(--ns-primary);
  color: var(--ns-primary);
}

.restriction-chip--selected {
  border-color: var(--ns-primary);
  background: color-mix(in srgb, var(--ns-primary) 10%, white);
  color: var(--ns-primary);
  font-weight: 500;
}

.restrictions-hint {
  font-size: 0.75rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 0;
}

.onboarding-error {
  color: var(--p-red-500);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}
</style>
