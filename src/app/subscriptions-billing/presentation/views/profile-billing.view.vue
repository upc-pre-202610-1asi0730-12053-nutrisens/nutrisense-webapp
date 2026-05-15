<!-- PATH: src/app/subscriptions-billing/presentation/views/profile-billing.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import PlanCard from '../components/plan-card.component.vue'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()

const store = useSubscriptionsBillingStore()
const {
  plans,
  paymentHistory,
  currentPlan,
  willCancelAtPeriodEnd,
  renewalDateLabel,
  subscriptionLoaded,
  plansLoaded,
  paymentHistoryLoaded,
  changingPlanId,
  errors,
} = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''

const showUpgradeDialog = ref(false)
const billingPeriod = ref('monthly')

/** @type {import('vue').ComputedRef<import('../../domain/model/subscription-plan.entity.js').SubscriptionPlan[]>} */
const selectablePlans = computed(() =>
  currentPlan.value
    ? plans.value.filter(p => p.id !== currentPlan.value.id)
    : plans.value.filter(p => !p.isFree())
)

const isLoading = computed(() => !subscriptionLoaded.value || !plansLoaded.value)

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
  store.fetchPaymentHistory(userId)
})

/**
 * Opens a confirmation dialog and changes the subscription plan on confirm.
 * @param {string} planId
 */
function handleSelectPlan(planId) {
  const target = plans.value.find(p => p.id === planId)
  const planName = target ? t(target.key) : ''
  confirm.require({
    message: t('subscription.confirmChangePlanMessage', { plan: planName }),
    header: t('profile.changePlanTitle'),
    acceptLabel: t('subscription.confirm'),
    rejectLabel: t('common.cancel'),
    accept() {
      showUpgradeDialog.value = false
      store.changePlan(planId, billingPeriod.value)
        .then(() => toast.add({ severity: 'success', summary: t('subscription.planChangeSuccess'), life: 3000 }))
    },
  })
}

/** Opens a confirmation dialog and cancels the subscription at period end on confirm. */
function handleCancel() {
  const planName = currentPlan.value ? t(currentPlan.value.key) : ''
  confirm.require({
    message: t('profile.cancelPlanBody', { plan: planName, date: renewalDateLabel.value }),
    header:  t('profile.cancelPlanTitle', { plan: planName }),
    acceptLabel: t('profile.cancelPlan'),
    rejectLabel: t('profile.keepPlan'),
    acceptClass: 'p-button-danger',
    accept() {
      store.cancelSubscription()
      toast.add({ severity: 'info', summary: t('profile.planCancelled', { date: renewalDateLabel.value }), life: 4000 })
    },
  })
}

/** Reactivates a previously cancelled subscription and shows a success toast. */
function handleReactivate() {
  store.reactivateSubscription()
  toast.add({ severity: 'success', summary: t('subscription.reactivate'), life: 3000 })
}

/**
 * Returns the translated plan name for a given plan ID, falling back to the raw ID.
 * @param {string} planId
 * @returns {string}
 */
function getPlanName(planId) {
  const plan = plans.value.find(p => p.id === planId)
  return plan ? t(plan.key) : planId
}
</script>

<template>
  <div>
    <h2 class="section-title">{{ t('profile.billing') }}</h2>

    <pv-message v-if="errors.length" severity="error" :closable="false" class="mb-3">
      {{ t('common.error') }}
    </pv-message>

    <!-- Current plan -->
    <pv-card class="mb-3">
      <template #title>{{ t('profile.currentPlan') }}</template>
      <template #content>
        <pv-skeleton v-if="isLoading" height="80px" border-radius="8px" />

        <div v-else class="plan-row">
          <div>
            <div class="plan-name-row">
              <span class="plan-name">{{ currentPlan ? t(currentPlan.key) : t('subscription.free') }}</span>
              <pv-tag severity="success" :value="t('subscription.active')" />
            </div>

            <p v-if="willCancelAtPeriodEnd" class="plan-renews plan-renews--danger">
              {{ t('subscription.cancelsOn', { date: renewalDateLabel }) }}
            </p>
            <p v-else-if="renewalDateLabel" class="plan-renews">
              {{ t('profile.renewsOn', { date: renewalDateLabel }) }}
            </p>
          </div>

          <div class="plan-actions">
            <pv-button
              v-if="willCancelAtPeriodEnd"
              :label="t('subscription.reactivate')"
              severity="success"
              :aria-label="t('subscription.reactivate')"
              @click="handleReactivate"
            />
            <template v-else>
              <pv-button
                v-if="selectablePlans.length"
                :label="t('subscription.changePlan')"
                icon="pi pi-sync"
                icon-pos="right"
                :aria-label="t('subscription.changePlan')"
                @click="showUpgradeDialog = true"
              />
              <pv-button
                v-if="currentPlan && !currentPlan.isFree()"
                :label="t('profile.cancelPlan')"
                severity="danger"
                text
                :aria-label="t('profile.cancelPlan')"
                @click="handleCancel"
              />
            </template>
          </div>
        </div>
      </template>
    </pv-card>

    <!-- Payment history -->
    <pv-card>
      <template #title>{{ t('profile.paymentHistory') }}</template>
      <template #content>
        <pv-skeleton v-if="!paymentHistoryLoaded" height="150px" border-radius="8px" />

        <p v-else-if="!paymentHistory.length" class="text-secondary">
          {{ t('paymentHistory.noPayments') }}
        </p>

        <pv-data-table
          v-else
          :value="paymentHistory"
          size="small"
          :aria-label="t('profile.paymentHistory')"
          striped-rows
        >
          <pv-column field="paidAt" :header="t('paymentHistory.date')">
            <template #body="{ data }">
              {{ new Date(data.paidAt).toLocaleDateString() }}
            </template>
          </pv-column>

          <pv-column field="planId" :header="t('paymentHistory.plan')">
            <template #body="{ data }">
              {{ getPlanName(data.planId) }}
            </template>
          </pv-column>

          <pv-column field="amountUsd" :header="t('paymentHistory.amount')">
            <template #body="{ data }">
              ${{ data.amountUsd.toFixed(2) }}
            </template>
          </pv-column>

          <pv-column field="status" :header="t('paymentHistory.status')">
            <template #body="{ data }">
              <pv-tag
                :value="t(`paymentHistory.${data.status}`)"
                :severity="data.status === 'paid' ? 'success' : 'secondary'"
              />
            </template>
          </pv-column>
        </pv-data-table>
      </template>
    </pv-card>

    <!-- Upgrade dialog -->
    <pv-dialog
      v-model:visible="showUpgradeDialog"
      :header="t('profile.changePlanTitle')"
      :modal="true"
      :draggable="false"
      style="width: 640px; max-width: 95vw"
    >
      <div class="upgrade-dialog">
        <div class="upgrade-dialog__plans">
          <plan-card
            v-for="plan in selectablePlans"
            :key="plan.id"
            :plan="plan"
            :is-current-plan="false"
            :billing-period="billingPeriod"
            :is-changing="changingPlanId === plan.id"
            :is-upgrade="isPlanUpgrade(plan.id)"
            @select="handleSelectPlan"
          />
        </div>
      </div>

      <template #footer>
        <pv-button
          :label="t('common.cancel')"
          severity="secondary"
          text
          @click="showUpgradeDialog = false"
        />
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 1.25rem;
}

.plan-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.plan-name-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.25rem;
}

.plan-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.plan-renews {
  font-size: 0.8125rem;
  color: var(--ns-text-muted);
  margin: 0;
}

.plan-renews--danger {
  color: var(--ns-danger);
}

.plan-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.text-secondary {
  color: var(--ns-text-secondary);
  font-size: 0.875rem;
}

.upgrade-dialog__plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
</style>
