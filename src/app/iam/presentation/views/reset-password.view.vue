<!-- PATH: src/app/iam/presentation/views/reset-password.view.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'

const { t } = useI18n()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const success = ref(false)

/** Simulates a password reset and redirects to login on success. */
function handleReset() {
  if (!newPassword.value || newPassword.value !== confirmPassword.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 1500)
  }, 800)
}
</script>

<template>
  <div class="auth-page" role="main">
    <div class="auth-card">
      <header class="auth-topbar">
        <LanguageSwitcher variant="light" />
      </header>
      <div class="auth-card__brand">NutriSense</div>
      <h1 class="auth-card__title">{{ t('auth.resetPassword.title') }}</h1>

      <pv-message v-if="success" severity="success" :closable="false">
        {{ t('auth.resetPassword.success') }}
      </pv-message>

      <form v-if="!success" class="auth-form" @submit.prevent="handleReset" novalidate>
        <div class="auth-form__field">
          <label for="reset-new" class="auth-form__label">{{ t('auth.resetPassword.newPassword') }}</label>
          <pv-password
            id="reset-new"
            v-model="newPassword"
            :placeholder="t('auth.resetPassword.newPassword')"
            :aria-label="t('auth.resetPassword.newPassword')"
            toggle-mask
            class="w-full"
            input-class="w-full"
          />
        </div>

        <div class="auth-form__field">
          <label for="reset-confirm" class="auth-form__label">{{ t('auth.resetPassword.confirmPassword') }}</label>
          <pv-password
            id="reset-confirm"
            v-model="confirmPassword"
            :placeholder="t('auth.resetPassword.confirmPassword')"
            :aria-label="t('auth.resetPassword.confirmPassword')"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full"
          />
        </div>

        <pv-button
          type="submit"
          :label="t('auth.resetPassword.submit')"
          :loading="loading"
          :disabled="!newPassword || newPassword !== confirmPassword"
          class="w-full"
        />
      </form>
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
  margin: 0 0 1.5rem;
  text-align: center;
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
</style>
