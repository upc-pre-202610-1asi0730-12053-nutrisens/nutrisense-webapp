<!-- PATH: src/app/iam/presentation/views/profile-dietary.view.vue -->
<script setup>
import { ref, watch, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useIamStore } from '../../application/iam.store.js'

const { t } = useI18n()
const toast = useToast()
const iamStore = useIamStore()
const { currentUser, userLoaded } = toRefs(iamStore)

const DIETARY_RESTRICTIONS = [
  'lactose-free', 'gluten-free', 'vegan', 'vegetarian',
  'nut-free', 'seafood-free', 'kosher', 'halal',
]

const MEDICAL_CONDITIONS = [
  'type-2-diabetes', 'high-blood-pressure', 'coeliac-disease',
  'hypothyroidism', 'kidney-disease', 'gout',
]

const activeRestrictions = ref(/** @type {string[]} */ ([]))
const activeConditions   = ref(/** @type {string[]} */ ([]))
const saving  = ref(false)
const saveErr = ref(false)

watch(currentUser, user => {
  if (!user) return
  activeRestrictions.value = [...(user.dietaryRestrictions ?? [])]
  activeConditions.value   = [...(user.medicalConditions   ?? [])]
}, { immediate: true })

/**
 * Toggles a dietary restriction in the active list.
 * @param {string} value
 */
function toggleRestriction(value) {
  activeRestrictions.value = activeRestrictions.value.includes(value)
    ? activeRestrictions.value.filter(r => r !== value)
    : [...activeRestrictions.value, value]
}

/**
 * Toggles a medical condition in the active list.
 * @param {string} value
 */
function toggleCondition(value) {
  activeConditions.value = activeConditions.value.includes(value)
    ? activeConditions.value.filter(c => c !== value)
    : [...activeConditions.value, value]
}

/** Persists dietary restrictions and medical conditions. */
function handleSave() {
  saving.value  = true
  saveErr.value = false
  iamStore.updateProfile({
    dietaryRestrictions: [...activeRestrictions.value],
    medicalConditions:   [...activeConditions.value],
  })
    .then(() => {
      toast.add({ severity: 'success', summary: t('profile.healthUpdated'), life: 3000 })
    })
    .catch(() => {
      saveErr.value = true
    })
    .finally(() => {
      saving.value = false
    })
}
</script>

<template>
  <div>
    <h2 class="section-title">{{ t('profile.dietaryRestrictions') }}</h2>

    <pv-skeleton v-if="!userLoaded" height="260px" border-radius="12px" />

    <div v-if="userLoaded">
      <pv-card>
        <template #content>
          <div class="health-section">
            <p class="health-section__label">{{ t('profile.dietaryTitle') }}</p>
            <div class="chips-grid">
              <button
                v-for="r in DIETARY_RESTRICTIONS"
                :key="r"
                type="button"
                class="chip"
                :class="{ 'chip--active': activeRestrictions.includes(r) }"
                :aria-pressed="activeRestrictions.includes(r)"
                role="checkbox"
                @click="toggleRestriction(r)"
              >
                {{ t('restriction.' + r) }}
              </button>
            </div>
          </div>

          <div class="health-section">
            <p class="health-section__label">{{ t('profile.medicalTitle') }}</p>
            <div class="chips-grid">
              <button
                v-for="c in MEDICAL_CONDITIONS"
                :key="c"
                type="button"
                class="chip"
                :class="{ 'chip--active': activeConditions.includes(c) }"
                :aria-pressed="activeConditions.includes(c)"
                role="checkbox"
                @click="toggleCondition(c)"
              >
                {{ t('condition.' + c) }}
              </button>
            </div>
          </div>

          <pv-message severity="info" :closable="false" class="mt-3">
            {{ t('profile.dietaryAutoBanner') }}
          </pv-message>

          <pv-message v-if="saveErr" severity="error" :closable="false" class="mt-2">
            {{ t('common.error') }}
          </pv-message>

          <div class="actions">
            <pv-button
              type="button"
              :label="t('profile.saveChanges')"
              icon="pi pi-check"
              :loading="saving"
              @click="handleSave"
            />
          </div>
        </template>
      </pv-card>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 1.25rem;
}

.health-section {
  margin-bottom: 1.5rem;
}

.health-section__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-text);
  margin: 0 0 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.375rem 0.875rem;
  border-radius: var(--ns-radius-full);
  border: 1.5px solid var(--ns-border);
  background: var(--ns-surface);
  color: var(--ns-text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  font-family: var(--ns-font);
}

.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.chip--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
