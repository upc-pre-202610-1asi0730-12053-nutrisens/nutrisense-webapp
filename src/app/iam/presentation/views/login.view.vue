<!-- PATH: src/app/iam/presentation/views/login.view.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'
import { useSubscriptionsBillingStore } from '../../../subscriptions-billing/application/subscriptions-billing.store.js'
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.vue'

const { t } = useI18n()
const router = useRouter()
const iamStore = useIamStore()
const billingStore = useSubscriptionsBillingStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

/**
 * Attempts to sign in with the provided credentials.
 * Redirects to plan-selection if the user has no active subscription, otherwise to dashboard.
 */
function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''

  iamStore.signIn(email.value, password.value)
    .then(user => {
      if (!user) {
        errorMsg.value = t('auth.login.error')
        return null
      }
      localStorage.setItem('ns_user_id', user.id)
      return billingStore.checkSubscription(user.id)
    })
    .then(hasSub => {
      if (hasSub === null) return
      router.push({ name: hasSub ? 'dashboard' : 'plan-selection' })
    })
    .catch(() => {
      errorMsg.value = t('auth.login.error')
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
      <h1 class="auth-card__title">{{ t('auth.login.title') }}</h1>
      <p class="auth-card__subtitle">{{ t('auth.login.subtitle') }}</p>

      <form class="auth-form" @submit.prevent="handleLogin" novalidate>
        <div class="auth-form__field">
          <label for="login-email" class="auth-form__label">{{ t('auth.login.email') }}</label>
          <pv-input-text
            id="login-email"
            v-model="email"
            type="email"
            :placeholder="t('auth.login.email')"
            :aria-label="t('auth.login.email')"
            class="w-full"
            autocomplete="email"
          />
        </div>

        <div class="auth-form__field">
          <label for="login-password" class="auth-form__label">{{ t('auth.login.password') }}</label>
          <pv-password
            id="login-password"
            v-model="password"
            :placeholder="t('auth.login.password')"
            :aria-label="t('auth.login.password')"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full"
            autocomplete="current-password"
          />
        </div>

        <pv-message v-if="errorMsg" severity="error" :closable="false">
          {{ errorMsg }}
        </pv-message>

        <pv-button
          type="submit"
          :label="t('auth.login.submit')"
          :loading="loading"
          :disabled="!email || !password"
          class="w-full"
        />
      </form>

      <div class="auth-card__links">
        <router-link :to="{ name: 'recover-password' }" class="auth-link">
          {{ t('auth.login.forgotPassword') }}
        </router-link>
      </div>

      <p class="auth-card__footer">
        {{ t('auth.login.noAccount') }}
        <router-link :to="{ name: 'register' }" class="auth-link auth-link--strong">
          {{ t('auth.login.register') }}
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
  text-align: right;
  margin-top: 0.75rem;
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
</style>
