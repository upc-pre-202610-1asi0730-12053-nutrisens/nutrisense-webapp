<!-- PATH: src/app/subscriptions-billing/presentation/views/plan-selection.view.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../../iam/application/iam.store.js'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'
import { FEATURE_I18N, HIDDEN_PLAN_FEATURES } from '../feature-i18n.js'

const { t } = useI18n()
const router = useRouter()
const iamStore = useIamStore()
const billingStore = useSubscriptionsBillingStore()

const userId = localStorage.getItem('ns_user_id') ?? ''
if (!iamStore.userLoaded) iamStore.fetchCurrentUser(userId)

onMounted(() => {
  if (!billingStore.plansLoaded) billingStore.fetchPlans()
})

// Display order for the marketing cards.
const PLAN_RANK = { basic: 0, pro: 1, premium: 2 }

const sortedPlans = computed(() =>
  [...billingStore.plans].sort((a, b) => (PLAN_RANK[a.key] ?? 99) - (PLAN_RANK[b.key] ?? 99))
)

/**
 * Plans prepared for the marketing cards: internal-only features are hidden,
 * and each tier above the first is summarised as "Everything in {prev}" plus
 * only the features it adds over the previous tier.
 */
const displayPlans = computed(() =>
  sortedPlans.value.map((plan, i) => {
    const prev = i > 0 ? sortedPlans.value[i - 1] : null
    const visible = keys => keys.filter(k => !HIDDEN_PLAN_FEATURES.has(k))
    const features = prev
      ? [`everything-in-${prev.key}`, ...visible(plan.featuresGainedOver(prev))]
      : visible(plan.features)
    return {
      key: plan.key,
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      features,
    }
  })
)

const billingPeriod = ref('monthly')
const billingOptions = [
  { label: t('planSelection.monthly'), value: 'monthly' },
  { label: t('planSelection.annual'),  value: 'annual' },
]

const selectingPlanKey = ref('')

/** @param {string} featureKey */
function featureText(featureKey) {
  return t(FEATURE_I18N[featureKey] ?? featureKey)
}

function annualTotal(plan) {
  return plan.priceAnnual ?? plan.priceMonthly * 12 * 0.8
}

function displayPrice(plan) {
  return billingPeriod.value === 'annual' ? annualTotal(plan) / 12 : plan.priceMonthly
}

function handleSelectPlan(planKey) {
  selectingPlanKey.value = planKey
  router.push({ name: 'checkout', query: { planKey, billingPeriod: billingPeriod.value } })
}

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

      <div class="billing-toggle">
        <pv-select-button
          v-model="billingPeriod"
          :options="billingOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('subscription.billingPeriod')"
        />
        <span v-if="billingPeriod === 'annual'" class="billing-toggle__savings">
          {{ t('planSelection.annualSavings') }}
        </span>
      </div>

      <div v-if="!billingStore.plansLoaded" class="plan-grid">
        <pv-skeleton v-for="n in 3" :key="n" height="420px" border-radius="16px" />
      </div>

      <div v-else class="plan-grid">
        <div
          v-for="plan in displayPlans"
          :key="plan.key"
          class="plan-card"
          :class="{ 'plan-card--featured': plan.key === 'pro' }"
        >
          <div v-if="plan.key === 'pro'" class="plan-card__badge">
            {{ t('planSelection.recommended') }}
          </div>

          <h2 class="plan-card__name">{{ t('plan.' + plan.key) }}</h2>

          <div class="plan-card__price">
            <span class="plan-card__price-amount">${{ formatNum(displayPrice(plan)) }}</span>
            <span class="plan-card__price-period">{{ t('planSelection.perMonth') }}</span>
          </div>

          <div v-if="billingPeriod === 'annual'" class="plan-card__annual-note">
            {{ t('planSelection.billedAnnually', { total: formatNum(annualTotal(plan)) }) }}
          </div>

          <ul class="plan-card__features" :aria-label="t('planSelection.includedFeatures')">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="plan-card__feature"
            >
              <i class="pi pi-check plan-card__feature-icon" aria-hidden="true" />
              {{ featureText(feature) }}
            </li>
          </ul>

          <pv-button
            :label="t('planSelection.select', { plan: t('plan.' + plan.key) })"
            :loading="selectingPlanKey === plan.key"
            :disabled="!!selectingPlanKey && selectingPlanKey !== plan.key"
            :outlined="plan.key !== 'pro'"
            class="w-full mt-auto"
            @click="handleSelectPlan(plan.key)"
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
  margin: 0 0 1.5rem;
}

.billing-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.billing-toggle__savings {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-primary);
  background: rgba(34, 197, 94, 0.1);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
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
  margin-bottom: 0.375rem;
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

.plan-card__annual-note {
  font-size: 0.75rem;
  color: var(--ns-text-secondary);
  margin-bottom: 1rem;
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
