<!-- PATH: src/app/subscriptions-billing/presentation/views/checkout.view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { PaymentMethod } from '../../domain/model/payment-method.entity.js'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const { t } = useI18n()
const router = useRouter()
const route  = useRoute()
const toast  = useToast()

const billingStore = useSubscriptionsBillingStore()
const iamStore     = useIamStore()

const userId = localStorage.getItem('ns_user_id') ?? ''
const planId = route.query.planId ?? ''

onMounted(() => {
  if (!billingStore.plansLoaded) billingStore.fetchPlans()
  if (!iamStore.currentUser)     iamStore.fetchCurrentUser(userId)
})

const selectedPlan = computed(() => billingStore.plans.find(p => p.id === planId) ?? null)

/** @type {import('vue').Ref<string>} */
const cardNumber      = ref('')
/** @type {import('vue').Ref<string>} */
const cardholderName  = ref('')
/** @type {import('vue').Ref<string>} */
const expiry          = ref('')
/** @type {import('vue').Ref<string>} */
const cvv             = ref('')

const fieldErrors = ref({ cardNumber: '', cardholderName: '', expiry: '', cvv: '' })

/** @type {import('vue').ComputedRef<string>} */
const cardBrand = computed(() => PaymentMethod.detectBrand(cardNumber.value))

/** @type {import('vue').ComputedRef<string>} */
const brandIcon = computed(() => {
  const map = { visa: 'pi-credit-card', mastercard: 'pi-credit-card', amex: 'pi-credit-card', other: 'pi-credit-card' }
  return map[cardBrand.value] ?? 'pi-credit-card'
})

/**
 * Formats raw card digits into groups of 4 separated by spaces.
 * @param {string} raw
 * @returns {string}
 */
function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

/** @param {Event} e */
function onCardNumberInput(e) {
  cardNumber.value = formatCardNumber(e.target.value)
  e.target.value   = cardNumber.value
  fieldErrors.value.cardNumber = ''
}

/** @param {Event} e */
function onExpiryInput(e) {
  let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
  if (raw.length >= 3) raw = raw.slice(0, 2) + '/' + raw.slice(2)
  expiry.value     = raw
  e.target.value   = raw
  fieldErrors.value.expiry = ''
}

/** @param {Event} e */
function onCvvInput(e) {
  cvv.value = e.target.value.replace(/\D/g, '').slice(0, cardBrand.value === 'amex' ? 4 : 3)
  e.target.value = cvv.value
  fieldErrors.value.cvv = ''
}

/**
 * Validates all card fields and returns true when all pass.
 * @returns {boolean}
 */
function validate() {
  const errs = { cardNumber: '', cardholderName: '', expiry: '', cvv: '' }
  const digits = cardNumber.value.replace(/\D/g, '')
  if (digits.length < 16) errs.cardNumber = t('checkout.errorCardNumber')

  if (!cardholderName.value.trim()) errs.cardholderName = t('checkout.errorName')

  const [mm, yy] = expiry.value.split('/')
  const month = parseInt(mm, 10)
  const year  = parseInt('20' + yy, 10)
  const now   = new Date()
  if (!mm || !yy || month < 1 || month > 12 || year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)) {
    errs.expiry = t('checkout.errorExpiry')
  }

  const cvvLen = cardBrand.value === 'amex' ? 4 : 3
  if (cvv.value.length < cvvLen) errs.cvv = t('checkout.errorCvv')

  fieldErrors.value = errs
  return !Object.values(errs).some(Boolean)
}

const paying = computed(() => billingStore.paymentProcessing)

async function handlePay() {
  if (!validate()) return

  const [mm, yy] = expiry.value.split('/')
  const user = iamStore.currentUser

  try {
    await billingStore.processPayment(userId, planId, {
      cardNumber:     cardNumber.value,
      expiryMonth:    parseInt(mm, 10),
      expiryYear:     parseInt('20' + yy, 10),
      cardholderName: cardholderName.value.trim(),
    })

    if (user) {
      const tierKey = planId.replace('plan-', '')
      await iamStore.updateProfile({
        firstName:         user.firstName,
        lastName:          user.lastName,
        email:             user.email.value,
        biologicalSex:     user.biologicalSex.value,
        dateOfBirth:       user.dateOfBirth,
        heightCm:          user.heightCm,
        goal:              user.goal.value,
        activityLevel:     user.activityLevel.value,
        preferredUnits:    user.preferredUnits.value,
        preferredLanguage: user.preferredLanguage,
        plan:              tierKey,
        homeCityId:        user.homeCityId ?? '',
        createdAt:         user.createdAt,
      })
    }

    router.push({ name: 'payment-success' })
  } catch {
    toast.add({ severity: 'error', summary: t('checkout.errorPayment'), life: 4000 })
  }
}
</script>

<template>
  <div class="checkout-page" role="main">
    <div class="checkout-wrap">

      <!-- Brand -->
      <div class="checkout-wrap__brand">NutriSense</div>
      <h1 class="checkout-wrap__title">{{ t('checkout.title') }}</h1>
      <p class="checkout-wrap__subtitle">{{ t('checkout.subtitle') }}</p>

      <div class="checkout-layout">

        <!-- Order Summary -->
        <aside class="checkout-summary" aria-label="t('checkout.orderSummary')">
          <h2 class="checkout-summary__heading">{{ t('checkout.orderSummary') }}</h2>
          <template v-if="selectedPlan">
            <div class="checkout-summary__plan-name">{{ t(selectedPlan.key) }}</div>
            <div class="checkout-summary__price">
              <span class="checkout-summary__amount">${{ formatNum(selectedPlan.priceMonthly) }}</span>
              <span class="checkout-summary__period">{{ t('checkout.billedMonthly') }}</span>
            </div>
            <ul class="checkout-summary__features" aria-label="Included features">
              <li
                v-for="feature in selectedPlan.features.slice(0, 5)"
                :key="feature"
                class="checkout-summary__feature"
              >
                <i class="pi pi-check" aria-hidden="true" />
                {{ feature }}
              </li>
            </ul>
          </template>
          <pv-skeleton v-else height="140px" border-radius="10px" />

          <div class="checkout-summary__secure">
            <i class="pi pi-lock" aria-hidden="true" />
            {{ t('checkout.secureNotice') }}
          </div>
        </aside>

        <!-- Card Form -->
        <section class="checkout-form" aria-label="t('checkout.cardDetails')">
          <h2 class="checkout-form__heading">{{ t('checkout.cardDetails') }}</h2>

          <!-- Card number -->
          <div class="checkout-field">
            <label class="checkout-field__label" for="card-number">
              {{ t('checkout.cardNumber') }}
            </label>
            <div class="checkout-field__input-wrap" :class="{ 'checkout-field__input-wrap--error': fieldErrors.cardNumber }">
              <input
                id="card-number"
                class="checkout-field__input"
                type="text"
                inputmode="numeric"
                autocomplete="cc-number"
                maxlength="19"
                :placeholder="'1234 5678 9012 3456'"
                :aria-label="t('checkout.cardNumber')"
                :aria-invalid="!!fieldErrors.cardNumber"
                @input="onCardNumberInput"
              />
              <i class="pi pi-credit-card checkout-field__icon" aria-hidden="true" />
            </div>
            <span v-if="fieldErrors.cardNumber" class="checkout-field__error" role="alert">
              {{ fieldErrors.cardNumber }}
            </span>
          </div>

          <!-- Cardholder name -->
          <div class="checkout-field">
            <label class="checkout-field__label" for="cardholder-name">
              {{ t('checkout.cardholderName') }}
            </label>
            <input
              id="cardholder-name"
              v-model="cardholderName"
              class="checkout-field__input"
              :class="{ 'checkout-field__input--error': fieldErrors.cardholderName }"
              type="text"
              autocomplete="cc-name"
              :placeholder="'John Smith'"
              :aria-label="t('checkout.cardholderName')"
              :aria-invalid="!!fieldErrors.cardholderName"
              @input="fieldErrors.cardholderName = ''"
            />
            <span v-if="fieldErrors.cardholderName" class="checkout-field__error" role="alert">
              {{ fieldErrors.cardholderName }}
            </span>
          </div>

          <!-- Expiry + CVV -->
          <div class="checkout-row">
            <div class="checkout-field">
              <label class="checkout-field__label" for="expiry">
                {{ t('checkout.expiry') }}
              </label>
              <input
                id="expiry"
                class="checkout-field__input"
                :class="{ 'checkout-field__input--error': fieldErrors.expiry }"
                type="text"
                inputmode="numeric"
                autocomplete="cc-exp"
                maxlength="5"
                placeholder="MM/YY"
                :aria-label="t('checkout.expiry')"
                :aria-invalid="!!fieldErrors.expiry"
                @input="onExpiryInput"
              />
              <span v-if="fieldErrors.expiry" class="checkout-field__error" role="alert">
                {{ fieldErrors.expiry }}
              </span>
            </div>

            <div class="checkout-field">
              <label class="checkout-field__label" for="cvv">
                {{ t('checkout.cvv') }}
              </label>
              <input
                id="cvv"
                class="checkout-field__input"
                :class="{ 'checkout-field__input--error': fieldErrors.cvv }"
                type="password"
                inputmode="numeric"
                autocomplete="cc-csc"
                :maxlength="cardBrand === 'amex' ? 4 : 3"
                :placeholder="cardBrand === 'amex' ? '0000' : '000'"
                :aria-label="t('checkout.cvv')"
                :aria-invalid="!!fieldErrors.cvv"
                @input="onCvvInput"
              />
              <span v-if="fieldErrors.cvv" class="checkout-field__error" role="alert">
                {{ fieldErrors.cvv }}
              </span>
            </div>
          </div>

          <!-- Submit -->
          <pv-button
            class="checkout-form__submit"
            :loading="paying"
            :disabled="!selectedPlan || paying"
            @click="handlePay"
          >
            <template v-if="paying">{{ t('checkout.processing') }}</template>
            <template v-else-if="selectedPlan">
              {{ t('checkout.payNow', { amount: formatNum(selectedPlan.priceMonthly) }) }}
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

/* Layout */
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

/* Fields */
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

.checkout-field__input-wrap {
  position: relative;
}

.checkout-field__input-wrap .checkout-field__input {
  padding-right: 2.5rem;
}

.checkout-field__icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #b0aba6;
  font-size: 1rem;
  pointer-events: none;
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

.checkout-field__input--error,
.checkout-field__input-wrap--error .checkout-field__input {
  border-color: var(--color-danger);
}

.checkout-field__error {
  font-size: 0.75rem;
  color: var(--color-danger);
}

/* Row: expiry + cvv */
.checkout-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
