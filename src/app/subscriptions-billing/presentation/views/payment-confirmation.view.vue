<!-- PATH: src/app/subscriptions-billing/presentation/views/payment-confirmation.view.vue -->
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'

const { t } = useI18n()
const router = useRouter()
const billingStore = useSubscriptionsBillingStore()

const paymentMethod  = computed(() => billingStore.paymentMethod ?? billingStore.lastPaymentMethod)
const currentPlan    = computed(() => billingStore.currentPlan)
const planName       = computed(() => currentPlan.value ? t('plan.' + currentPlan.value.key) : '')
</script>

<template>
  <div class="confirm-page" role="main">
    <div class="confirm-wrap">

      <div class="confirm-wrap__brand">NutriSense</div>

      <div class="confirm-icon" aria-hidden="true">
        <i class="pi pi-check-circle" />
      </div>

      <h1 class="confirm-wrap__title">{{ t('paymentSuccess.title') }}</h1>
      <p class="confirm-wrap__subtitle">
        {{ t('paymentSuccess.subtitle', { plan: planName }) }}
      </p>

      <div v-if="paymentMethod" class="confirm-card">
        <span class="confirm-card__label">{{ t('paymentSuccess.chargedTo') }}</span>
        <span class="confirm-card__value">
          <i class="pi pi-credit-card" aria-hidden="true" />
          {{ paymentMethod.maskedNumber() }}
          &nbsp;&middot;&nbsp;
          {{ paymentMethod.expiryLabel() }}
        </span>
      </div>

      <pv-button
        :label="t('paymentSuccess.goToDashboard')"
        icon="pi pi-arrow-right"
        icon-pos="right"
        size="large"
        class="confirm-wrap__cta"
        @click="router.push({ name: 'dashboard' })"
      />
    </div>
  </div>
</template>

<style scoped>
.confirm-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  padding: 3rem 1.5rem;
}

.confirm-wrap {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
}

.confirm-wrap__brand {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.01em;
}

.confirm-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon .pi {
  font-size: 2.25rem;
  color: #16a34a;
}

.confirm-wrap__title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.02em;
}

.confirm-wrap__subtitle {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.confirm-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.875rem 1.5rem;
  width: 100%;
}

.confirm-card__label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.confirm-card__value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.confirm-card__value .pi {
  color: var(--color-primary);
}

.confirm-wrap__cta {
  width: 100%;
  justify-content: center;
  font-weight: 700;
  margin-top: 0.5rem;
}
</style>
