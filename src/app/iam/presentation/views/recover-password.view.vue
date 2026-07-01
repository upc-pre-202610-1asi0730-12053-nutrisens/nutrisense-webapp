<!-- PATH: src/app/iam/presentation/views/recover-password.view.vue -->
<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'

const { t } = useI18n()
const iamStore = useIamStore()

const email = ref('')
const submitted = ref(false)
const loading = ref(false)

/**
 * Requests a password reset link. The backend never reveals whether the email
 * is registered, so we always show the same confirmation on a completed request.
 */
async function handleSubmit() {
  if (!email.value) return
  loading.value = true
  try {
    await iamStore.requestPasswordReset(email.value)
    submitted.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page" role="main">
    <div class="auth-card">
      <header class="auth-topbar">
        <LanguageSwitcher variant="light" />
      </header>
      <div class="auth-card__brand">NutriSense</div>
      <h1 class="auth-card__title">{{ t('auth.recoverPassword.title') }}</h1>
      <p class="auth-card__subtitle">{{ t('auth.recoverPassword.subtitle') }}</p>

      <pv-message v-if="submitted" severity="success" :closable="false" class="mb-3">
        {{ t('auth.recoverPassword.sent') }}
      </pv-message>

      <form v-if="!submitted" class="auth-form" @submit.prevent="handleSubmit" novalidate>
        <div class="auth-form__field">
          <label for="recover-email" class="auth-form__label">{{ t('auth.recoverPassword.email') }}</label>
          <pv-input-text
            id="recover-email"
            v-model="email"
            type="email"
            :placeholder="t('auth.recoverPassword.email')"
            :aria-label="t('auth.recoverPassword.email')"
            class="w-full"
            autocomplete="email"
          />
        </div>

        <pv-button
          type="submit"
          :label="t('auth.recoverPassword.submit')"
          :loading="loading"
          :disabled="!email"
          class="w-full"
        />
      </form>

      <div class="auth-card__links">
        <router-link :to="{ name: 'login' }" class="auth-link">
          {{ t('auth.recoverPassword.backToLogin') }}
        </router-link>
      </div>
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
  max-width: 420px;
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

.auth-card__links {
  text-align: center;
  margin-top: 1.25rem;
}

.auth-link {
  color: var(--ns-primary);
  text-decoration: none;
  font-size: 0.8125rem;
}
</style>
