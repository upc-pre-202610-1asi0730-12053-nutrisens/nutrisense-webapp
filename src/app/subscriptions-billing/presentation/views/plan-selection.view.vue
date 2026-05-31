<!-- PATH: src/app/subscriptions-billing/presentation/views/plan-selection.view.vue -->
<script setup>
import { ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const { t } = useI18n()
const router = useRouter()
const billingStore = useSubscriptionsBillingStore()
const iamStore = useIamStore()
const { plans, plansLoaded, errors } = toRefs(billingStore)

const userId = localStorage.getItem('ns_user_id') ?? ''
const selectingPlanId = ref('')

billingStore.fetchPlans()
iamStore.fetchCurrentUser(userId)


/** @type {Record<string, string>} */
const FEATURE_I18N = {
  'nutrition-log':          'subscription.featureNutritionLog',
  'basic-dashboard':        'subscription.featureBasicDashboard',
  'bmi-calculator':         'subscription.featureBmiCalculator',
  'smart-scan':             'subscription.featureSmartScan',
  'travel-mode':            'subscription.featureTravelMode',
  'weather-recommendations':'subscription.featureWeatherRecs',
  'pantry-recipes':         'subscription.featurePantry',
  'google-fit':             'subscription.featureGoogleFit',
  'menu-scan':              'subscription.featureMenuScan',
  'unlimited-history':      'subscription.featureUnlimitedHistory',
  'pdf-reports':            'subscription.featurePdfReports',
}

/**
 * Navigates to the checkout step for the chosen plan.
 * @param {string} planId - e.g. 'plan-pro'
 */
function handleSelectPlan(planId) {
  selectingPlanId.value = planId
  router.push({ name: 'checkout', query: { planId } })
}

/** Signs out and returns to login. */
function handleLater() {
  iamStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="plan-selection-page" role="main">
    <div class="plan-selection-wrap">
      <div class="plan-selection-wrap__brand">NutriSense</div>
      <h1 class="plan-selection-wrap__title">{{ t('planSelection.title') }}</h1>
      <p class="plan-selection-wrap__subtitle">{{ t('planSelection.subtitle') }}</p>

      <div v-if="errors.length" class="plan-selection-error">{{ t('common.error') }}</div>

      <div v-if="!plansLoaded" class="plan-grid">
        <pv-skeleton v-for="n in 3" :key="n" height="360px" border-radius="12px" />
      </div>

      <div v-else class="plan-grid">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card"
          :class="{ 'plan-card--featured': plan.id === 'plan-pro' }"
        >
          <div v-if="plan.id === 'plan-pro'" class="plan-card__badge">
            {{ t('planSelection.recommended') }}
          </div>

          <h2 class="plan-card__name">{{ t(plan.key) }}</h2>

          <div class="plan-card__price">
            <span class="plan-card__price-amount">${{ formatNum(plan.priceMonthly) }}</span>
            <span class="plan-card__price-period">{{ t('planSelection.perMonth') }}</span>
          </div>

          <ul class="plan-card__features" aria-label="Included features">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="plan-card__feature"
            >
              <i class="pi pi-check plan-card__feature-icon" aria-hidden="true" />
              {{ t(FEATURE_I18N[feature] ?? feature) }}
            </li>
          </ul>

          <pv-button
            :label="t('planSelection.select', { plan: t(plan.key) })"
            :loading="selectingPlanId === plan.id"
            :disabled="!!selectingPlanId && selectingPlanId !== plan.id"
            :outlined="plan.id !== 'plan-pro'"
            class="w-full mt-auto"
            @click="handleSelectPlan(plan.id)"
          />
        </div>
      </div>

      <div class="plan-selection-footer">
        <pv-button
          :label="t('planSelection.later')"
          severity="secondary"
          text
          @click="handleLater"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-selection-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #ffffff;
  padding: 3rem 1.5rem;
}

.plan-selection-wrap {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.plan-selection-wrap__brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-primary);
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
}

.plan-selection-wrap__title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.5rem;
  text-align: center;
}

.plan-selection-wrap__subtitle {
  font-size: 0.9375rem;
  color: var(--ns-text-secondary);
  text-align: center;
  margin: 0 0 2.5rem;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  width: 100%;
}

.plan-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.75rem 1.5rem;
  position: relative;
  transition: box-shadow 0.15s;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.plan-card--featured {
  border-color: var(--ns-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.plan-card__badge {
  position: absolute;
  top: -0.75rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ns-primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  white-space: nowrap;
}

.plan-card__name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.75rem;
}

.plan-card__price {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.plan-card__price-amount {
  font-size: 2rem;
  font-weight: 800;
  color: var(--ns-text);
  line-height: 1;
}

.plan-card__price-period {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
}

.plan-card__features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.plan-card__feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--ns-text);
}

.plan-card__feature-icon {
  color: var(--ns-primary);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.plan-selection-footer {
  margin-top: 2rem;
}

.plan-selection-error {
  color: var(--p-red-500);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

@media (max-width: 700px) {
  .plan-grid {
    grid-template-columns: 1fr;
  }
}
</style>
