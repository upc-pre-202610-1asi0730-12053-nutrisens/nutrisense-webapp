<!-- PATH: src/app/iam/presentation/views/profile-personal-info.view.vue -->
<script setup>
import { ref, computed, watch, toRefs, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useIamStore } from '../../application/iam.store.js'
import { SmartRecommendationsApi } from '../../../smart-recommendations/infrastructure/smart-recommendations.api.js'
import { CityAssembler } from '../../../smart-recommendations/infrastructure/city.assembler.js'

const { t, locale } = useI18n()
const toast = useToast()
const iamStore = useIamStore()
const { currentUser, userLoaded, errors } = toRefs(iamStore)

onMounted(() => iamStore.clearErrors())

const form = ref({
  firstName:     '',
  lastName:      '',
  email:         '',
  dateOfBirth:   '',
  biologicalSex: 'male',
  heightCm:      170,
  activityLevel: 'moderately-active',
  homeCityId:    /** @type {number|''} */ (''),
})

const sexOptions = [
  { label: t('auth.register.sexMale'),      value: 'male' },
  { label: t('auth.register.sexFemale'),    value: 'female' },
  { label: t('auth.register.sexPreferNot'), value: 'prefer-not-to-say' },
]

const activityLevelOptions = [
  { label: t('profile.activityLevels.sedentary'),         value: 'sedentary' },
  { label: t('profile.activityLevels.lightly-active'),    value: 'lightly-active' },
  { label: t('profile.activityLevels.moderately-active'), value: 'moderately-active' },
  { label: t('profile.activityLevels.very-active'),       value: 'very-active' },
  { label: t('profile.activityLevels.extra-active'),      value: 'extra-active' },
]

watch(currentUser, user => {
  if (!user) return
  form.value = {
    firstName:     user.firstName             ?? '',
    lastName:      user.lastName              ?? '',
    email:         user.email.value           ?? '',
    dateOfBirth:   user.dateOfBirth           ?? '',
    biologicalSex: user.biologicalSex.value   ?? 'male',
    heightCm:      user.heightCm              ?? 170,
    activityLevel: user.activityLevel.value   ?? 'moderately-active',
    homeCityId:    user.homeCityId            ?? '',
  }
}, { immediate: true })

// ── City picker ──────────────────────────────────────────────────────────────

const _smartRecsApi = new SmartRecommendationsApi()
/** @type {import('vue').Ref<ReturnType<import('../../../smart-recommendations/domain/model/city.entity.js').City>[]>} */
const _availableCities = ref([])

onMounted(() => {
  _smartRecsApi.getCities()
    .then(res => { _availableCities.value = CityAssembler.toEntitiesFromResponse(res) })
    .catch(() => {})
})

const citySearch   = ref('')
const cityOpen     = ref(false)
const cityInputRef = ref(/** @type {HTMLInputElement|null} */ (null))
/** @type {import('vue').Ref<Object[]>} Backend search hits (local catalog + geocoding candidates). */
const citySearchResults = ref([])
const citySearchLoading = ref(false)
/** @type {ReturnType<typeof setTimeout>|null} */
let citySearchTimer = null

/** Debounced backend city search; <2 chars falls back to the locally loaded catalog. */
watch(citySearch, q => {
  const term = q.trim()
  if (citySearchTimer) clearTimeout(citySearchTimer)
  if (term.length < 2) {
    citySearchResults.value = []
    citySearchLoading.value = false
    return
  }
  citySearchLoading.value = true
  citySearchTimer = setTimeout(() => {
    _smartRecsApi.searchCities(term, 5)
      .then(res => { citySearchResults.value = Array.isArray(res.data) ? res.data : [] })
      .catch(() => { citySearchResults.value = [] })
      .finally(() => { citySearchLoading.value = false })
  }, 350)
})

/** @type {import('vue').ComputedRef<{ key: string, label: string, sub: string, value: number|null, raw: Object }[]>} */
const cityOptions = computed(() =>
  _availableCities.value.map(c => ({
    key: String(c.id),
    label: locale.value.startsWith('es') ? c.nameEs : c.nameEn,
    sub: c.country,
    value: c.id,
    raw: { id: c.id, nameEn: c.nameEn, nameEs: c.nameEs, country: c.country, lat: c.lat, lng: c.lng },
  }))
)

/** @type {import('vue').ComputedRef<string>} */
const selectedCityLabel = computed(() =>
  cityOptions.value.find(c => c.value === form.value.homeCityId)?.label ?? ''
)

/** @type {import('vue').ComputedRef<{ key: string, label: string, sub: string, value: number|null, raw: Object }[]>} */
const filteredCities = computed(() => {
  const term = citySearch.value.trim()
  if (term.length < 2) {
    const q = term.toLowerCase()
    return q ? cityOptions.value.filter(c => c.label.toLowerCase().includes(q)) : cityOptions.value
  }
  return citySearchResults.value.map(r => ({
    key: String(r.id ?? `${r.lat},${r.lng}`),
    label: locale.value.startsWith('es') ? r.nameEs : r.nameEn,
    sub: r.state ? `${r.country}, ${r.state}` : r.country,
    value: r.id ?? null,
    raw: r,
  }))
})

/** Opens the city search dropdown. */
function openCityPicker() {
  cityOpen.value = true
  nextTick(() => cityInputRef.value?.focus())
}

/**
 * Selects a city and closes the dropdown.
 * @param {{ label: string, value: string }} city
 */
async function selectCity(city) {
  let id = city.value
  if (id == null) {
    // Geocoding candidate not yet in the catalog: import it to obtain a real id.
    const res = await _smartRecsApi.importCity({
      name: city.raw.nameEn ?? city.raw.nameEs,
      nameEn: city.raw.nameEn,
      nameEs: city.raw.nameEs,
      country: city.raw.country,
      lat: city.raw.lat,
      lng: city.raw.lng,
    }).catch(() => null)
    const entity = res ? CityAssembler.toEntityFromResponse(res) : null
    if (!entity) return
    if (!_availableCities.value.some(c => c.id === entity.id)) {
      _availableCities.value = [..._availableCities.value, entity]
    }
    id = entity.id
  }
  form.value.homeCityId = id
  citySearch.value = ''
  citySearchResults.value = []
  cityOpen.value = false
}

/** Clears the selection and reopens the picker. */
function clearCity() {
  form.value.homeCityId = ''
  citySearch.value = ''
  cityOpen.value = true
  nextTick(() => cityInputRef.value?.focus())
}

function handleCityBlur() {
  setTimeout(() => { cityOpen.value = false }, 150)
}

/** Persists the profile changes. */
function handleSave() {
  iamStore.updateProfile({ ...form.value })
    .then(() => {
      toast.add({ severity: 'success', summary: t('profile.profileUpdated'), life: 3000 })
    })
    .catch(() => {
      toast.add({ severity: 'error', summary: t('common.error'), life: 3000 })
    })
}
</script>

<template>
  <div class="pi-view">

    <!-- View header -->
    <div class="pi-view__header">
      <div>
        <h2 class="pi-view__title">{{ t('profile.personalInfo') }}</h2>
        <p class="pi-view__subtitle">{{ t('profile.personalInfoSubtitle') }}</p>
      </div>
      <pv-button
        :label="t('profile.saveChanges')"
        icon="pi pi-check"
        :disabled="!userLoaded"
        @click="handleSave"
      />
    </div>

    <pv-message v-if="errors.length" severity="error" :closable="false" class="mb-3">
      {{ t('common.error') }}
    </pv-message>

    <!-- Loading skeleton -->
    <div v-if="!userLoaded" class="pi-skeleton-grid">
      <pv-skeleton v-for="i in 6" :key="i" height="64px" border-radius="10px" />
    </div>

    <div v-else class="pi-sections">

      <!-- ── Identity ── -->
      <section class="pi-section" aria-labelledby="section-identity">
        <div class="pi-section__header">
          <div class="pi-section__icon" aria-hidden="true">
            <i class="pi pi-user" />
          </div>
          <h3 id="section-identity" class="pi-section__title">{{ t('profile.sectionIdentity') }}</h3>
        </div>

        <div class="pi-section__body">

          <div class="pi-field pi-field--half">
            <label for="pi-first" class="pi-field__label">{{ t('profile.firstName') }}</label>
            <pv-input-text
              id="pi-first"
              v-model="form.firstName"
              :placeholder="t('profile.firstName')"
              :aria-label="t('profile.firstName')"
              class="w-full"
            />
          </div>

          <div class="pi-field pi-field--half">
            <label for="pi-last" class="pi-field__label">{{ t('profile.lastName') }}</label>
            <pv-input-text
              id="pi-last"
              v-model="form.lastName"
              :placeholder="t('profile.lastName')"
              :aria-label="t('profile.lastName')"
              class="w-full"
            />
          </div>

          <div class="pi-field pi-field--full">
            <div class="pi-field__label-row">
              <label for="pi-email" class="pi-field__label">{{ t('profile.email') }}</label>
              <span class="pi-field__readonly-badge" aria-label="read only">
                <i class="pi pi-lock" aria-hidden="true" />
                {{ t('profile.emailReadonly') }}
              </span>
            </div>
            <div class="pi-readonly-field">
              <i class="pi pi-envelope pi-readonly-field__icon" aria-hidden="true" />
              <span class="pi-readonly-field__value">{{ form.email }}</span>
            </div>
          </div>

          <div class="pi-field pi-field--half">
            <label for="pi-dob" class="pi-field__label">{{ t('profile.dateOfBirth') }}</label>
            <pv-input-text
              id="pi-dob"
              v-model="form.dateOfBirth"
              type="date"
              :aria-label="t('profile.dateOfBirth')"
              class="w-full"
            />
          </div>

          <div class="pi-field pi-field--half">
            <label class="pi-field__label">{{ t('profile.sex') }}</label>
            <pv-select-button
              v-model="form.biologicalSex"
              :options="sexOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('profile.sex')"
            />
          </div>

        </div>
      </section>

      <!-- ── Physical ── -->
      <section class="pi-section" aria-labelledby="section-physical">
        <div class="pi-section__header">
          <div class="pi-section__icon" aria-hidden="true">
            <i class="pi pi-chart-bar" />
          </div>
          <h3 id="section-physical" class="pi-section__title">{{ t('profile.sectionPhysical') }}</h3>
        </div>

        <div class="pi-section__body">

          <div class="pi-field pi-field--half">
            <label for="pi-height" class="pi-field__label">{{ t('profile.height') }}</label>
            <pv-input-number
              id="pi-height"
              v-model="form.heightCm"
              :min="100"
              :max="250"
              suffix=" cm"
              :aria-label="t('profile.height')"
              class="w-full"
            />
          </div>

          <div class="pi-field pi-field--full">
            <label for="pi-activity" class="pi-field__label">{{ t('profile.activityLevel') }}</label>
            <pv-select
              id="pi-activity"
              v-model="form.activityLevel"
              :options="activityLevelOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('profile.activityLevel')"
              class="w-full"
            />
          </div>

        </div>
      </section>

      <!-- ── Location ── -->
      <section class="pi-section" aria-labelledby="section-location">
        <div class="pi-section__header">
          <div class="pi-section__icon" aria-hidden="true">
            <i class="pi pi-map-marker" />
          </div>
          <h3 id="section-location" class="pi-section__title">{{ t('profile.sectionLocation') }}</h3>
        </div>

        <div class="pi-section__body">
          <div class="pi-field pi-field--full">
            <label class="pi-field__label">{{ t('onboarding.homeCity') }}</label>

            <!-- Selected city pill -->
            <div v-if="form.homeCityId && !cityOpen" class="city-pill" role="group" :aria-label="t('onboarding.homeCity')">
              <i class="pi pi-map-marker city-pill__icon" aria-hidden="true" />
              <span class="city-pill__label">{{ selectedCityLabel }}</span>
              <button class="city-pill__clear" :aria-label="t('common.clear')" @click="clearCity">
                <i class="pi pi-times" aria-hidden="true" />
              </button>
            </div>

            <!-- Trigger (no city selected) -->
            <button
              v-else-if="!cityOpen"
              class="city-trigger"
              :aria-label="t('onboarding.searchCity')"
              type="button"
              @click="openCityPicker"
            >
              <i class="pi pi-map-marker" aria-hidden="true" />
              <span>{{ t('onboarding.searchCity') }}</span>
              <i class="pi pi-chevron-down city-trigger__chevron" aria-hidden="true" />
            </button>

            <!-- Search dropdown -->
            <div v-if="cityOpen" class="city-dropdown" role="combobox" aria-expanded="true" :aria-label="t('onboarding.homeCity')">
              <pv-input-text
                ref="cityInputRef"
                v-model="citySearch"
                :placeholder="t('onboarding.searchCity')"
                class="w-full city-dropdown__input"
                :aria-label="t('onboarding.searchCity')"
                @blur="handleCityBlur"
              />
              <ul class="city-dropdown__list" role="listbox">
                <li
                  v-for="city in filteredCities"
                  :key="city.key"
                  class="city-dropdown__item"
                  role="option"
                  :aria-selected="form.homeCityId === city.value && city.value != null"
                  tabindex="0"
                  @mousedown.prevent="selectCity(city)"
                  @keydown.enter="selectCity(city)"
                >
                  <i class="pi pi-map-marker city-dropdown__item-icon" aria-hidden="true" />
                  <span class="city-dropdown__item-label">{{ city.label }}</span>
                  <span class="city-dropdown__item-sub">{{ city.sub }}</span>
                  <i v-if="city.value == null" class="pi pi-globe city-dropdown__item-new" :title="t('recommendations.newCity')" aria-hidden="true" />
                </li>
                <li v-if="citySearchLoading" class="city-dropdown__empty">
                  <i class="pi pi-spin pi-spinner" aria-hidden="true" />
                  {{ t('recommendations.searchingCity') }}
                </li>
                <li v-else-if="!filteredCities.length" class="city-dropdown__empty">
                  <i class="pi pi-search" aria-hidden="true" />
                  {{ t('onboarding.noCity') }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* ── View shell ── */
.pi-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pi-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.pi-view__title {
  font-size: 1.1875rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.2rem;
}

.pi-view__subtitle {
  font-size: 0.8125rem;
  color: var(--ns-text-muted);
  margin: 0;
}

/* ── Loading skeleton ── */
.pi-skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* ── Sections ── */
.pi-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pi-section {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.pi-section__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: var(--color-surface, #fafaf9);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.pi-section__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(80, 139, 137, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pi-section__icon .pi {
  font-size: 0.9rem;
  color: var(--color-primary);
}

.pi-section__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ns-text);
  margin: 0;
}

.pi-section__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1.25rem;
}

/* ── Fields ── */
.pi-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pi-field--half { grid-column: span 1; }
.pi-field--full { grid-column: 1 / -1; }

.pi-field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ns-text-secondary);
  letter-spacing: 0.01em;
}

.pi-field__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pi-field__readonly-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--ns-text-muted, #9ca3af);
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 99px;
  padding: 0.1rem 0.5rem;
}

.pi-field__readonly-badge .pi { font-size: 0.6rem; }

/* ── Readonly email field ── */
.pi-readonly-field {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.6rem 0.875rem;
  background: var(--color-surface, #fafaf9);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: default;
}

.pi-readonly-field__icon {
  font-size: 0.875rem;
  color: var(--ns-text-muted, #9ca3af);
  flex-shrink: 0;
}

.pi-readonly-field__value {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  font-weight: 500;
}

/* ── City picker ── */
.city-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.875rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fafaf9);
  font-size: 0.875rem;
  color: var(--ns-text);
}

.city-pill__icon {
  font-size: 0.875rem;
  color: var(--color-primary);
  flex-shrink: 0;
}

.city-pill__label { flex: 1; font-weight: 500; }

.city-pill__clear {
  background: none;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  color: var(--ns-text-secondary);
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s;
  font-size: 0.75rem;
}

.city-pill__clear:hover { color: #ef4444; }

.city-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.875rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.15s;
}

.city-trigger:hover { border-color: var(--color-primary); }
.city-trigger span { flex: 1; }
.city-trigger__chevron { font-size: 0.75rem; color: var(--ns-text-secondary); }

.city-dropdown {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.city-dropdown__input {
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  border-bottom: 1px solid var(--color-border, #e5e7eb) !important;
}

.city-dropdown__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.city-dropdown__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  color: var(--ns-text);
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid #f5f5f5;
}

.city-dropdown__item:last-child { border-bottom: none; }
.city-dropdown__item:hover,
.city-dropdown__item:focus { background: var(--color-surface, #fafaf9); outline: none; }

.city-dropdown__item[aria-selected="true"] {
  background: rgba(80, 139, 137, 0.08);
  color: var(--color-primary);
  font-weight: 600;
}

.city-dropdown__item-icon { font-size: 0.8125rem; color: var(--ns-text-secondary); flex-shrink: 0; }
.city-dropdown__item-label { flex: 0 0 auto; }
.city-dropdown__item-sub {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.city-dropdown__item-new { margin-left: auto; font-size: 0.8125rem; color: var(--ns-primary); opacity: 0.7; }

.city-dropdown__empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
}

/* ── Responsive ── */
@media (max-width: 540px) {
  .pi-section__body { grid-template-columns: 1fr; }
  .pi-field--half { grid-column: 1 / -1; }
  .pi-skeleton-grid { grid-template-columns: 1fr; }
}
</style>
