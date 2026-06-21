<!-- PATH: src/app/subscriptions-billing/presentation/views/payment-history.view.vue -->
<script setup>
import { onMounted, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { backendMessage } from '../../../shared/infrastructure/api-error.js'
import { useSubscriptionsBillingStore } from '../../application/subscriptions-billing.store.js'

const { t } = useI18n()
const store = useSubscriptionsBillingStore()

const { paymentHistory, paymentHistoryLoaded, subscriptionLoaded, errors } = toRefs(store)

const userId = localStorage.getItem('ns_user_id') ?? ''

onMounted(() => {
  // fetchSubscription chains fetchPaymentHistory automatically once the
  // subscription ID is known (needed to call GET /payments/by-subscription/{id})
  if (!store.subscriptionLoaded) {
    store.fetchSubscription(userId)
  } else {
    store.fetchPaymentHistory()
  }
})
</script>

<template>
  <div class="payment-view">
    <h2 class="payment-view__title">{{ t('paymentHistory.title') }}</h2>

    <pv-message v-if="errors.length" severity="error" :closable="false">
      {{ backendMessage(errors[errors.length - 1]) ?? t('common.error') }}
    </pv-message>

    <pv-skeleton v-if="!subscriptionLoaded || !paymentHistoryLoaded" height="250px" border-radius="12px" />

    <div v-else-if="!paymentHistory.length" class="payment-view__empty">
      <i class="pi pi-receipt" aria-hidden="true" />
      <span>{{ t('paymentHistory.noPayments') }}</span>
    </div>

    <pv-data-table
      v-else
      :value="paymentHistory"
      class="payment-table"
      :aria-label="t('paymentHistory.title')"
      striped-rows
    >
      <pv-column field="paidAt" :header="t('paymentHistory.date')">
        <template #body="{ data }">
          {{ data.paidAt ? new Date(data.paidAt).toLocaleDateString() : '—' }}
        </template>
      </pv-column>

      <pv-column field="amount" :header="t('paymentHistory.amount')">
        <template #body="{ data }">
          ${{ data.amount.toFixed(2) }} {{ data.currency }}
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
  </div>
</template>

<style scoped>
.payment-view__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 1.25rem;
}

.payment-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem;
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  color: var(--ns-text-muted);
  font-size: 0.875rem;
}
</style>
