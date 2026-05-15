<!-- PATH: src/app/subscriptions-billing/presentation/views/subscription.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import PlanCard from '../components/plan-card.component.vue'

const { t } = useI18n()
const store = useSubscriptionsBillingStore()

const {
  subscription,
  plans,
  currentPlan,
  willCancelAtPeriodEnd,
  renewalDateLabel,
  subscriptionLoaded,
  plansLoaded,
  changingPlanId,
  errors,
} = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''

const billingPeriod = ref('monthly')
const billingOptions = [
  { label: t('subscription.monthly'), value: 'monthly' },
  { label: t('subscription.annual'),  value: 'annual' },
]

const pendingPlanId = ref(/** @type {string|null} */ (null))
const showConfirmDialog = ref(false)
const planChangeSuccess = ref(false)

/** @type {import('vue').ComputedRef<ReturnType<import('../../domain/model/subscription-plan.entity.js').SubscriptionPlan>|null>} */
const pendingPlan = computed(() =>
  plans.value.find(p => p.id === pendingPlanId.value) ?? null
)

/**
 * @param {string} planId
 * @returns {boolean}
 */
function isPlanUpgrade(planId) {
  if (!currentPlan.value) return true
  const target = plans.value.find(p => p.id === planId)
  return target ? target.isUpgradeFrom(currentPlan.value) : true
}

onMounted(() => {
  store.fetchSubscription(userId)
  store.fetchPlans()
})

/**
 * Opens the confirmation dialog for a plan change.
 * @param {string} planId
 */
function handleSelectPlan(planId) {
  pendingPlanId.value = planId
  showConfirmDialog.value = true
  planChangeSuccess.value = false
}

/** Submits the pending plan change to the store, then clears the dialog state. */
function handleConfirmChange() {
  if (!pendingPlanId.value) return
  showConfirmDialog.value = false
  store.changePlan(pendingPlanId.value, billingPeriod.value)
    .then(() => { planChangeSuccess.value = true })
  pendingPlanId.value = null
}

/** Closes the confirmation dialog without applying any changes. */
function handleCancelDialog() {
  showConfirmDialog.value = false
  pendingPlanId.value = null
}

/** Cancels the active subscription at the end of the current billing period. */
function handleCancel() {
  store.cancelSubscription()
}

/** Reactivates a subscription that was previously set to cancel at period end. */
function handleReactivate() {
  store.reactivateSubscription()
}
</script>

<template>
  <div class="subscription-view">
    <h2 class="subscription-view__title">{{ t('subscription.title') }}</h2>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ t('common.error') }}
    </pv-message>

    <pv-message v-if="planChangeSuccess" severity="success" :closable="true" @close="planChangeSuccess = false">
      {{ t('subscription.planChangeSuccess') }}
    </pv-message>

    <pv-skeleton v-if="!subscriptionLoaded || !plansLoaded" height="300px" border-radius="12px" />

    <div v-else>
      <pv-card class="subscription-view__current">
        <template #title>{{ t('subscription.currentPlan') }}</template>
        <template #content>
          <div class="current-plan">
            <div class="current-plan__name">
              {{ currentPlan ? t(currentPlan.key) : t('subscription.free') }}
              <pv-tag severity="success" :value="t('subscription.active')" class="ml-2" />
            </div>

            <div v-if="subscription?.periodEnd" class="current-plan__renewal">
              <span v-if="willCancelAtPeriodEnd" class="text-danger">
                {{ t('subscription.cancelsOn', { date: renewalDateLabel }) }}
              </span>
              <span v-else>
                {{ t('subscription.renewsOn', { date: renewalDateLabel }) }}
              </span>
            </div>

            <div class="current-plan__actions">
              <pv-button
                v-if="willCancelAtPeriodEnd"
                :label="t('subscription.reactivate')"
                severity="success"
                :aria-label="t('subscription.reactivate')"
                @click="handleReactivate"
              />
              <pv-button
                v-else-if="currentPlan?.priceMonthly > 0"
                :label="t('subscription.cancelSubscription')"
                severity="secondary"
                outlined
                :aria-label="t('subscription.cancelSubscription')"
                @click="handleCancel"
              />
            </div>
          </div>
        </template>
      </pv-card>

      <pv-card class="subscription-view__plans">
        <template #title>{{ t('subscription.availablePlans') }}</template>
        <template #content>
          <div class="billing-toggle">
            <pv-select-button
              v-model="billingPeriod"
              :options="billingOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('subscription.billingPeriod')"
            />
          </div>

          <div class="plans-grid">
            <plan-card
              v-for="plan in plans"
              :key="plan.id"
              :plan="plan"
              :is-current-plan="currentPlan?.id === plan.id"
              :billing-period="billingPeriod"
              :is-changing="changingPlanId === plan.id"
              :is-upgrade="isPlanUpgrade(plan.id)"
              @select="handleSelectPlan"
            />
          </div>
        </template>
      </pv-card>
    </div>

    <pv-dialog
      :visible="showConfirmDialog"
      :header="t('subscription.confirmChangePlanTitle')"
      :modal="true"
      :draggable="false"
      style="width:420px;max-width:95vw"
      @update:visible="val => !val && handleCancelDialog()"
    >
      <p class="confirm-dialog__body">
        {{ t('subscription.confirmChangePlanMessage', { plan: pendingPlan ? t(pendingPlan.key) : '' }) }}
      </p>
      <template #footer>
        <pv-button
          :label="t('common.cancel')"
          text
          :aria-label="t('common.cancel')"
          @click="handleCancelDialog"
        />
        <pv-button
          :label="t('subscription.confirm')"
          :icon="isPlanUpgrade(pendingPlanId ?? '') ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"
          icon-pos="right"
          :aria-label="t('subscription.confirm')"
          @click="handleConfirmChange"
        />
      </template>
    </pv-dialog>

  </div>
</template>

<style scoped>
.subscription-view__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 1.25rem;
}

.subscription-view__current {
  margin-bottom: 1rem;
}

.current-plan__name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-text);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.current-plan__renewal {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  margin-bottom: 1rem;
}

.text-danger {
  color: var(--ns-danger);
}

.current-plan__actions {
  display: flex;
  gap: 0.75rem;
}

.billing-toggle {
  margin-bottom: 1.25rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.confirm-dialog__body {
  font-size: 0.9375rem;
  color: var(--ns-text-secondary);
  line-height: 1.55;
  margin: 0;
}
</style>
