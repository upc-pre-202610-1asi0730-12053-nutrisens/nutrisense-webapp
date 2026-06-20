<!-- PATH: src/app/subscriptions-billing/presentation/views/checkout.view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useStripeCard } from '../../../shared/infrastructure/use-stripe-card.js'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'
import { featureLabel, HIDDEN_PLAN_FEATURES } from '../feature-i18n.js'

const { t } = useI18n()
const router = useRouter()
const route  = useRoute()
const toast  = useToast()

const billingStore = useSubscriptionsBillingStore()
const iamStore     = useIamStore()

const userId        = localStorage.getItem('ns_user_id') ?? ''
const planKey       = route.query.planKey ?? ''
const billingPeriod = route.query.billingPeriod ?? 'monthly'

const cardElementRef  = ref(null)
const cardholderName  = ref('')
const nameError       = ref('')

const stripeCard = useStripeCard()

onMounted(async () => {
  if (!billingStore.plansLoaded) billingStore.fetchPlans()
  if (!iamStore.currentUser)     iamStore.fetchCurrentUser(userId)
  await stripeCard.mount(cardElementRef.value)
})

const selectedPlan = computed(() => billingStore.plans.find(p => p.key === planKey) ?? null)

const summaryFeatures = computed(() =>
  (selectedPlan.value?.features ?? [])
    .filter(f => !HIDDEN_PLAN_FEATURES.has(f))
    .slice(0, 5)
)

const displayPrice = computed(() => {
  if (!selectedPlan.value) return 0
  if (billingPeriod === 'annual') {
    const annual = selectedPlan.value.priceAnnual ?? selectedPlan.value.priceMonthly * 12 * 0.8
    return annual / 12
  }
  return selectedPlan.value.priceMonthly
})

const paying = computed(() => billingStore.paymentProcessing || stripeCard.stripeLoading.value)

function validateName() {
  nameError.value = cardholderName.value.trim() ? '' : t('checkout.errorName')
  return !nameError.value
}

async function handlePay() {
  if (!validateName()) return

  try {
    const { stripePaymentMethodId, cardMeta } = await stripeCard.createPaymentMethod(
      cardholderName.value.trim()
    )
    await billingStore.processPayment(userId, planKey, stripePaymentMethodId, cardMeta, billingPeriod)
    router.push({ name: 'payment-success' })
  } catch (err) {
    // Stripe errors are already in stripeCard.stripeError; backend errors go to toast
    if (!err?.type?.startsWith('card_error') && !err?.type?.startsWith('validation_error')) {
      toast.add({ severity: 'error', summary: t('checkout.errorPayment'), life: 4000 })
    }
  }
}
</script>

<template>
  <div class="checkout-page" role="main">
    <div class="checkout-wrap">

      <div class="checkout-wrap__brand">NutriSense</div>
      <h1 class="checkout-wrap__title">{{ t('checkout.title') }}</h1>
      <p class="checkout-wrap__subtitle">{{ t('checkout.subtitle') }}</p>

      <div class="checkout-layout">

        <!-- Order Summary -->
        <aside class="checkout-summary" :aria-label="t('checkout.orderSummary')">
          <h2 class="checkout-summary__heading">{{ t('checkout.orderSummary') }}</h2>
          <template v-if="selectedPlan">
            <div class="checkout-summary__plan-name">{{ t('plan.' + selectedPlan.key) }}</div>
            <div class="checkout-summary__price">
              <span class="checkout-summary__amount">${{ formatNum(displayPrice) }}</span>
              <span class="checkout-summary__period">
                {{ billingPeriod === 'annual' ? t('checkout.billedAnnually') : t('checkout.billedMonthly') }}
              </span>
            </div>
            <ul class="checkout-summary__features" :aria-label="t('checkout.includedFeatures')">
              <li
                v-for="feature in summaryFeatures"
                :key="feature"
                class="checkout-summary__feature"
              >
                <i class="pi pi-check" aria-hidden="true" />
                {{ featureLabel(t, feature) }}
              </li>
            </ul>
          </template>
          <pv-skeleton v-else height="140px" border-radius="10px" />

          <div class="checkout-summary__secure">
            <i class="pi pi-lock" aria-hidden="true" />
            {{ t('checkout.secureNotice') }}
          </div>
        </aside>

        <!-- Payment Form -->
        <section class="checkout-form" :aria-label="t('checkout.cardDetails')">
          <h2 class="checkout-form__heading">{{ t('checkout.cardDetails') }}</h2>

          <!-- Cardholder name (stays in our DOM — not sensitive) -->
          <div class="checkout-field">
            <label class="checkout-field__label" for="cardholder-name">
              {{ t('checkout.cardholderName') }}
            </label>
            <input
              id="cardholder-name"
              v-model="cardholderName"
              class="checkout-field__input"
              :class="{ 'checkout-field__input--error': nameError }"
              type="text"
              autocomplete="cc-name"
              :placeholder="'John Smith'"
              :aria-label="t('checkout.cardholderName')"
              :aria-invalid="!!nameError"
              @input="nameError = ''"
            />
            <span v-if="nameError" class="checkout-field__error" role="alert">{{ nameError }}</span>
          </div>

          <!-- Stripe CardElement (number + expiry + CVC in one secure iframe) -->
          <div class="checkout-field">
            <label class="checkout-field__label">{{ t('checkout.cardNumber') }}</label>
            <div
              ref="cardElementRef"
              class="stripe-card-element"
              :class="{ 'stripe-card-element--error': stripeCard.stripeError.value }"
              aria-label="Card number, expiry, and CVC"
            />
            <span v-if="stripeCard.stripeError.value" class="checkout-field__error" role="alert">
              {{ stripeCard.stripeError.value }}
            </span>
          </div>

          <pv-button
            class="checkout-form__submit"
            :loading="paying"
            :disabled="!selectedPlan || paying"
            @click="handlePay"
          >
            <template v-if="paying">{{ t('checkout.processing') }}</template>
            <template v-else-if="selectedPlan">
              {{ t('checkout.payNow', { amount: formatNum(displayPrice) }) }}
            </template>
          </pv-button>

          <div class="checkout-form__back">
            <button class="checkout-form__back-btn" @click="router.push({ name: 'plan-selection' })">
              <i class="pi pi-arrow-left" aria-hidden="true" />
              {{ t('checkout.backToPlans') }}
            </button>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #f9fafb;
  padding: 3rem 1.5rem;
}

.checkout-wrap {
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkout-wrap__brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
}

.checkout-wrap__title {
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.375rem;
  text-align: center;
}

.checkout-wrap__subtitle {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0 0 2.5rem;
}

.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.5rem;
  width: 100%;
  align-items: start;
}

/* Summary */
.checkout-summary {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkout-summary__heading {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.checkout-summary__plan-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-primary);
}

.checkout-summary__price {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.checkout-summary__amount {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.checkout-summary__period {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.checkout-summary__features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkout-summary__feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
}

.checkout-summary__feature .pi {
  color: var(--color-primary);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.checkout-summary__secure {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  border-top: 1px solid #f0ece9;
  padding-top: 0.875rem;
}

.checkout-summary__secure .pi {
  color: #22c55e;
  font-size: 0.875rem;
}

/* Form */
.checkout-form {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.checkout-form__heading {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.checkout-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.checkout-field__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.checkout-field__input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: 'Poppins', sans-serif;
  color: var(--color-text);
  background: #fff;
  transition: border-color 0.15s;
  box-sizing: border-box;
  outline: none;
}

.checkout-field__input:focus {
  border-color: var(--color-primary);
}

.checkout-field__input--error {
  border-color: var(--color-danger);
}

.checkout-field__error {
  font-size: 0.75rem;
  color: var(--color-danger);
}

/* Stripe CardElement host */
.stripe-card-element {
  padding: 0.65rem 0.875rem;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s;
  min-height: 42px;
}

.stripe-card-element:focus-within {
  border-color: var(--color-primary);
}

.stripe-card-element--error {
  border-color: var(--color-danger);
}

/* Submit */
.checkout-form__submit {
  width: 100%;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem;
  margin-top: 0.25rem;
}

.checkout-form__back {
  display: flex;
  justify-content: center;
}

.checkout-form__back-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  font-family: 'Poppins', sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  transition: color 0.15s;
  padding: 0;
}

.checkout-form__back-btn:hover {
  color: var(--color-primary);
}

@media (max-width: 680px) {
  .checkout-layout {
    grid-template-columns: 1fr;
  }
}
</style>
