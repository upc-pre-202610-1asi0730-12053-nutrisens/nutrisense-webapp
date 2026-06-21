<!-- PATH: src/app/iam/presentation/views/register.view.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'

const { t } = useI18n()
const router = useRouter()
const iamStore = useIamStore()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

/** @type {import('vue').Ref<Record<string, string>>} */
const fieldErrors = ref({})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HAS_LETTER_REGEX = /[a-zA-Z]/

/**
 * Validates all fields and populates fieldErrors.
 * @returns {boolean} true when all fields pass validation
 */
function validate() {
  const errors = {}
  if (!EMAIL_REGEX.test(email.value.trim())) {
    errors.email = t('auth.register.errorEmailInvalid')
  }
  if (password.value.length < 6) {
    errors.password = t('auth.register.errorPasswordTooShort')
  } else if (!HAS_LETTER_REGEX.test(password.value)) {
    errors.password = t('auth.register.errorPasswordNeedsLetter')
  }
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

/**
 * Submits the registration form.
 * Runs client-side validation first, then delegates to the store.
 * Shows a specific message when the email is already registered.
 */
function handleRegister() {
  if (!firstName.value || !lastName.value || !email.value || !password.value) return
  if (!validate()) return

  loading.value = true
  errorMsg.value = ''

  iamStore.signUp({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    biologicalSex: 'prefer-not-to-say',
    dateOfBirth: '',
    heightCm: 0,
    goal: 'weight-loss',
    activityLevel: 'moderately-active',
    preferredUnits: 'metric',
    preferredLanguage: 'en',
    homeCityId: '',
    plan: 'basic',
    createdAt: new Date().toISOString(),
  })
    .then(user => {
      if (user) {
        localStorage.setItem('ns_user_id', user.userId)
        router.push({ name: 'onboarding' })
      }
    })
    .catch(error => {
      errorMsg.value = error?.response?.status === 409
        ? t('auth.register.emailAlreadyRegistered')
        : t('common.error')
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <div class="auth-page" role="main">
    <div class="auth-card">
      <header class="auth-topbar">
        <LanguageSwitcher variant="light" />
      </header>
      <div class="auth-card__brand">NutriSense</div>
      <h1 class="auth-card__title">{{ t('auth.register.title') }}</h1>
      <p class="auth-card__subtitle">{{ t('auth.register.subtitle') }}</p>

      <form class="auth-form" @submit.prevent="handleRegister" novalidate>
        <div class="auth-form__row">
          <div class="auth-form__field">
            <label for="reg-first" class="auth-form__label">{{ t('auth.register.firstName') }}</label>
            <pv-input-text
              id="reg-first"
              v-model="firstName"
              :placeholder="t('auth.register.firstName')"
              :aria-label="t('auth.register.firstName')"
              class="w-full"
              autocomplete="given-name"
            />
          </div>
          <div class="auth-form__field">
            <label for="reg-last" class="auth-form__label">{{ t('auth.register.lastName') }}</label>
            <pv-input-text
              id="reg-last"
              v-model="lastName"
              :placeholder="t('auth.register.lastName')"
              :aria-label="t('auth.register.lastName')"
              class="w-full"
              autocomplete="family-name"
            />
          </div>
        </div>

        <div class="auth-form__field">
          <label for="reg-email" class="auth-form__label">{{ t('auth.register.email') }}</label>
          <pv-input-text
            id="reg-email"
            v-model="email"
            type="email"
            :placeholder="t('auth.register.email')"
            :aria-label="t('auth.register.email')"
            :invalid="!!fieldErrors.email"
            class="w-full"
            autocomplete="email"
          />
          <small v-if="fieldErrors.email" class="auth-form__field-error" role="alert">
            {{ fieldErrors.email }}
          </small>
        </div>

        <div class="auth-form__field">
          <label for="reg-password" class="auth-form__label">{{ t('auth.register.password') }}</label>
          <pv-password
            id="reg-password"
            v-model="password"
            :placeholder="t('auth.register.password')"
            :aria-label="t('auth.register.password')"
            :invalid="!!fieldErrors.password"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full"
            autocomplete="new-password"
          />
          <small v-if="fieldErrors.password" class="auth-form__field-error" role="alert">
            {{ fieldErrors.password }}
          </small>
        </div>

        <pv-message v-if="errorMsg" severity="error" :closable="false">
          {{ errorMsg }}
        </pv-message>

        <pv-button
          type="submit"
          :label="t('auth.register.submit')"
          :loading="loading"
          :disabled="!firstName || !lastName || !email || !password"
          class="w-full"
        />
      </form>

      <p class="auth-card__footer">
        {{ t('auth.register.hasAccount') }}
        <router-link :to="{ name: 'login' }" class="auth-link auth-link--strong">
          {{ t('auth.register.login') }}
        </router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 1.5rem;
}

.auth-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.auth-topbar {
  position: absolute;
  top: 0.875rem;
  right: 1rem;
}

.auth-card__brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-primary);
  margin-bottom: 1.5rem;
  text-align: center;
  letter-spacing: -0.01em;
}

.auth-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.375rem;
  text-align: center;
}

.auth-card__subtitle {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 0 0 1.75rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.auth-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .auth-form__row {
    grid-template-columns: 1fr;
  }
}

.auth-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth-form__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
}

.auth-card__footer {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 1.25rem 0 0;
}

.auth-link {
  color: var(--ns-primary);
  text-decoration: none;
  font-size: 0.8125rem;
}

.auth-link--strong {
  font-weight: 600;
}

.auth-form__field-error {
  color: var(--ns-danger);
  font-size: 0.75rem;
}
</style>
