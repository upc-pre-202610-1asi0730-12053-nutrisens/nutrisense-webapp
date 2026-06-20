<!-- PATH: src/app/subscriptions-billing/presentation/views/profile-billing.view.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'
import { useDomainLabels } from '../../../shared/composables/use-domain-labels.js'
import PlanCard from '../components/plan-card.component.vue'
import UpdatePaymentMethodDialog from '../components/update-payment-method-dialog.component.vue'

const { t } = useI18n()
const { planLabel } = useDomainLabels()
const toast = useToast()
const confirm = useConfirm()

const store = useSubscriptionsBillingStore()
const {
  subscription,
  plans,
  paymentHistory,
  paymentMethod,
  paymentMethodLoaded,
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
const showUpdateCardDialog = ref(false)
const cardUpdating = ref(false)
const billingPeriod = ref('monthly')

/** Plans excluding the currently active one */
const selectablePlans = computed(() =>
  currentPlan.value
    ? plans.value.filter(p => p.key !== currentPlan.value.key)
    : plans.value.filter(p => !p.isFree())
)

const isLoading = computed(() => !subscriptionLoaded.value || !plansLoaded.value)

const planChangeLimitReached = computed(() =>
  subscription.value ? !subscription.value.canChangePlanToday() : false
)

/**
 * @param {string} planKey
 * @returns {boolean}
 */
function isPlanUpgrade(planKey) {
  if (!currentPlan.value) return true
  const target = plans.value.find(p => p.key === planKey)
  return target ? target.isUpgradeFrom(currentPlan.value) : true
}

/**
 * @param {string} planKey
 * @returns {{ amount: number, days: number }}
 */
function getProratedInfo(planKey) {
  const toPlan = plans.value.find(p => p.key === planKey)
  if (!subscription.value || !currentPlan.value || !toPlan) return { amount: 0, days: 0 }
  const amount = subscription.value.proratedChangeAmount(currentPlan.value, toPlan)
  const days = subscription.value.daysUntilRenewal() ?? 0
  return { amount: Math.abs(amount), days }
}

onMounted(() => {
  store.fetchSubscription(userId)  // chains fetchPaymentHistory automatically
  store.fetchPlans()
})

/**
 * @param {string} planKey
 */
function handleSelectPlan(planKey) {
  const target = plans.value.find(p => p.key === planKey)
  const planName = target ? planLabel(target.key) : ''
  const isUpgrade = isPlanUpgrade(planKey)
  const { amount, days } = getProratedInfo(planKey)
  const cardInfo = paymentMethod.value ? `**** ${paymentMethod.value.lastFour}` : ''

  const messageKey = isUpgrade
    ? 'subscription.confirmChangePlanProrated'
    : 'subscription.confirmDowngradeProrated'

  const fullMessage = t(messageKey, { plan: planName, amount: amount.toFixed(2), days })
  const cardNote = cardInfo ? ` · ${cardInfo}` : ''

  confirm.require({
    message: fullMessage + cardNote,
    header: t('profile.changePlanTitle'),
    acceptLabel: t('subscription.confirm'),
    rejectLabel: t('common.cancel'),
    accept() {
      showUpgradeDialog.value = false
      store.changePlan(planKey, billingPeriod.value)
        .then(() => toast.add({ severity: 'success', summary: t('subscription.planChangeSuccess'), life: 3000 }))
        .catch(() => toast.add({ severity: 'error', summary: t('subscription.errorChangeLimitReached'), life: 4000 }))
    },
  })
}

function handleCancel() {
  const planName = currentPlan.value ? planLabel(currentPlan.value.key) : ''
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

function handleReactivate() {
  store.reactivateSubscription()
  toast.add({ severity: 'success', summary: t('subscription.reactivate'), life: 3000 })
}

/**
 * @param {{ stripePaymentMethodId: string, cardMeta: import('../../../shared/infrastructure/use-stripe-card.js').CardMeta }} result
 */
function handleUpdateCard({ stripePaymentMethodId, cardMeta }) {
  cardUpdating.value = true
  store.updatePaymentMethod(userId, stripePaymentMethodId, cardMeta)
    .then(() => {
      showUpdateCardDialog.value = false
      toast.add({ severity: 'success', summary: t('profile.cardUpdatedSuccess'), life: 3000 })
    })
    .catch(() => toast.add({ severity: 'error', summary: t('common.error'), life: 4000 }))
    .finally(() => { cardUpdating.value = false })
}

const deletingCard = ref(false)

function handleDeleteCard() {
  if (!paymentMethod.value) return
  confirm.require({
    message: t('profile.deleteCardConfirm'),
    header:  t('profile.deleteCardTitle'),
    acceptLabel: t('profile.deleteCard'),
    rejectLabel: t('common.cancel'),
    acceptClass: 'p-button-danger',
    accept() {
      deletingCard.value = true
      store.deletePaymentMethod(paymentMethod.value.id)
        .then(() => toast.add({ severity: 'info', summary: t('profile.cardDeleted'), life: 3000 }))
        .catch(() => toast.add({ severity: 'error', summary: t('common.error'), life: 4000 }))
        .finally(() => { deletingCard.value = false })
    },
  })
}
</script>

<template>
  <div>
    <h2 class="section-title">{{ t('profile.billing') }}</h2>

    <pv-message v-if="errors.length" severity="error" :closable="false" class="mb-3">
      {{ t('common.error') }}
    </pv-message>

    <!-- Pending payment banner -->
    <pv-message v-if="subscription?.status?.isPendingPayment()" severity="warn" :closable="false" class="mb-3">
      {{ t('subscription.pendingPaymentWarning') }}
    </pv-message>

    <!-- Current plan -->
    <pv-card class="mb-3">
      <template #title>{{ t('profile.currentPlan') }}</template>
      <template #content>
        <pv-skeleton v-if="isLoading" height="80px" border-radius="8px" />

        <div v-else class="plan-row">
          <div>
            <div class="plan-name-row">
              <span class="plan-name">{{ currentPlan ? planLabel(currentPlan.key) : t('subscription.free') }}</span>
              <pv-tag
                :severity="subscription?.status?.isActive() ? 'success' : 'secondary'"
                :value="subscription?.status?.isActive() ? t('subscription.active') : (subscription?.status?.value ?? '')"
              />
            </div>

            <p v-if="willCancelAtPeriodEnd" class="plan-renews plan-renews--danger">
              {{ t('subscription.cancelsOn', { date: renewalDateLabel }) }}
            </p>
            <p v-else-if="renewalDateLabel && subscription?.status?.isActive()" class="plan-renews">
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
            <template v-else-if="subscription?.status?.isActive()">
              <pv-button
                v-if="selectablePlans.length"
                :label="t('subscription.changePlan')"
                icon="pi pi-sync"
                icon-pos="right"
                :disabled="planChangeLimitReached"
                :aria-label="planChangeLimitReached ? t('subscription.changeLimitTooltip') : t('subscription.changePlan')"
                v-tooltip.top="planChangeLimitReached ? t('subscription.changeLimitTooltip') : undefined"
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

    <!-- Payment method (D.7b: update card requires Stripe tokenisation) -->
    <pv-card class="mb-3">
      <template #title>{{ t('profile.paymentMethod') }}</template>
      <template #content>
        <pv-skeleton v-if="!paymentMethodLoaded" height="56px" border-radius="8px" />

        <div v-else class="payment-method-row">
          <div v-if="paymentMethod" class="payment-method-card">
            <i class="pi pi-credit-card payment-method-card__icon" aria-hidden="true" />
            <span class="payment-method-card__number">{{ paymentMethod.maskedNumber() }}</span>
            <span class="payment-method-card__sep">&middot;</span>
            <span class="payment-method-card__expiry">{{ t('checkout.expiry').split(' ')[0] }} {{ paymentMethod.expiryLabel() }}</span>
            <pv-tag
              :value="paymentMethod.brand.toUpperCase()"
              severity="secondary"
              class="payment-method-card__brand"
            />
          </div>
          <p v-else class="text-secondary">{{ t('profile.noCardOnFile') }}</p>

          <div class="payment-method-actions">
            <pv-button
              :label="t('profile.updateCard')"
              icon="pi pi-pencil"
              icon-pos="right"
              severity="secondary"
              outlined
              :aria-label="t('profile.updateCard')"
              @click="showUpdateCardDialog = true"
            />
            <pv-button
              v-if="paymentMethod"
              icon="pi pi-trash"
              severity="danger"
              text
              :loading="deletingCard"
              :aria-label="t('profile.deleteCard')"
              v-tooltip.top="t('profile.deleteCard')"
              @click="handleDeleteCard"
            />
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
              {{ data.paidAt ? new Date(data.paidAt).toLocaleDateString() : '—' }}
            </template>
          </pv-column>

          <pv-column field="amount" :header="t('paymentHistory.amount')">
            <template #body="{ data }">
              <span>${{ data.amount.toFixed(2) }} {{ data.currency }}</span>
            </template>
          </pv-column>

          <pv-column field="status" :header="t('paymentHistory.status')">
            <template #body="{ data }">
              <pv-tag
                :value="t(`paymentHistory.${data.status}`)"
                :severity="data.status === 'paid' ? 'success' : data.status === 'failed' ? 'danger' : 'secondary'"
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
      <div class="upgrade-dialog__billing">
        <pv-select-button
          v-model="billingPeriod"
          :options="[{ label: t('subscription.monthly'), value: 'monthly' }, { label: t('subscription.annual'), value: 'annual' }]"
          option-label="label"
          option-value="value"
        />
      </div>
      <div class="upgrade-dialog__plans">
        <plan-card
          v-for="plan in selectablePlans"
          :key="plan.key"
          :plan="plan"
          :is-current-plan="false"
          :billing-period="billingPeriod"
          :is-changing="changingPlanId === plan.key"
          :is-upgrade="isPlanUpgrade(plan.key)"
          @select="handleSelectPlan"
        />
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

    <!-- Update card dialog (D.7b: requires Stripe tokenisation) -->
    <update-payment-method-dialog
      v-model:visible="showUpdateCardDialog"
      :loading="cardUpdating"
      @submit="handleUpdateCard"
    />
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

.payment-method-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.payment-method-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ns-text);
}

.payment-method-card__icon {
  color: var(--color-primary);
  font-size: 1.125rem;
}

.payment-method-card__sep {
  color: var(--ns-text-muted);
}

.payment-method-card__expiry {
  color: var(--ns-text-muted);
  font-weight: 400;
  font-size: 0.875rem;
}

.text-secondary {
  color: var(--ns-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.payment-method-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upgrade-dialog__billing {
  margin-bottom: 1rem;
}

.upgrade-dialog__plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
</style>
