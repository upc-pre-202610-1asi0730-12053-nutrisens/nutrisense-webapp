<!-- PATH: src/app/iam/presentation/views/reset-password.view.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const iamStore = useIamStore()

/** Reset token from the email link (?token=...). */
const token = computed(() => route.query.token ?? '')

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

// Mirrors the backend Password value object: at least 8 characters, including
// at least one letter and one digit. Kept in sync to fail fast on the client.
const PASSWORD_MIN_LENGTH = 8
const HAS_LETTER_REGEX = /[a-zA-Z]/
const HAS_DIGIT_REGEX = /\d/

/** Whether the new password meets the backend strength requirements. */
const isPasswordStrong = computed(() =>
  newPassword.value.length >= PASSWORD_MIN_LENGTH &&
  HAS_LETTER_REGEX.test(newPassword.value) &&
  HAS_DIGIT_REGEX.test(newPassword.value)
)

/** Whether both password fields match. */
const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)

/** Inline hint shown while the typed password is non-empty but still too weak. */
const passwordHint = computed(() =>
  newPassword.value && !isPasswordStrong.value ? t('auth.resetPassword.errorPasswordWeak') : ''
)

/** Inline hint shown when the confirmation field doesn't match. */
const confirmHint = computed(() =>
  confirmPassword.value && !passwordsMatch.value ? t('auth.resetPassword.errorPasswordMismatch') : ''
)

/** The submit button is enabled only when both fields are valid. */
const canSubmit = computed(() => isPasswordStrong.value && passwordsMatch.value)

/**
 * Submits the new password against the reset token. Validates strength on the
 * client first; on success redirects to login; on failure surfaces the backend
 * message (weak password vs. invalid/expired token, both 400).
 */
async function handleReset() {
  error.value = ''
  if (!isPasswordStrong.value) {
    error.value = t('auth.resetPassword.errorPasswordWeak')
    return
  }
  if (!passwordsMatch.value) return
  if (!token.value) {
    error.value = t('auth.resetPassword.invalidLink')
    return
  }
  loading.value = true
  try {
    const { ok, message } = await iamStore.resetPassword(token.value, newPassword.value)
    if (ok) {
      success.value = true
      setTimeout(() => router.push({ name: 'login' }), 1500)
    } else {
      error.value = message || t('auth.resetPassword.invalidLink')
    }
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
      <h1 class="auth-card__title">{{ t('auth.resetPassword.title') }}</h1>

      <pv-message v-if="success" severity="success" :closable="false">
        {{ t('auth.resetPassword.success') }}
      </pv-message>

      <pv-message v-if="error" severity="error" :closable="false" class="mb-3">
        {{ error }}
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
          <small v-if="passwordHint" class="auth-form__hint">{{ passwordHint }}</small>
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
          <small v-if="confirmHint" class="auth-form__hint">{{ confirmHint }}</small>
        </div>

        <pv-button
          type="submit"
          :label="t('auth.resetPassword.submit')"
          :loading="loading"
          :disabled="!canSubmit"
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

.auth-form__hint {
  font-size: 0.75rem;
  color: var(--ns-danger, #dc2626);
}
</style>
