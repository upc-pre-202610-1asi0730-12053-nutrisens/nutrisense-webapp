<!-- PATH: src/app/subscriptions-billing/presentation/components/update-payment-method-dialog.component.vue -->
<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStripeCard } from '../../../shared/infrastructure/use-stripe-card.js'

const { t } = useI18n()

const props = defineProps({
  visible: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
})

/**
 * Emits:
 *   update:visible  — closes the dialog
 *   submit          — { stripePaymentMethodId: string, cardMeta: CardMeta }
 */
const emit = defineEmits(['update:visible', 'submit'])

const cardElementRef  = ref(null)
const cardholderName  = ref('')
const nameError       = ref('')

const stripeCard = useStripeCard()

// Mount / destroy CardElement when the dialog opens / closes
watch(() => props.visible, async (open) => {
  if (open) {
    cardholderName.value = ''
    nameError.value = ''
    await nextTick()
    await stripeCard.mount(cardElementRef.value)
  } else {
    stripeCard.destroy()
  }
})

async function handleSubmit() {
  nameError.value = cardholderName.value.trim() ? '' : t('checkout.errorName')
  if (nameError.value) return

  try {
    const result = await stripeCard.createPaymentMethod(cardholderName.value.trim())
    emit('submit', result)
  } catch {
    // stripeCard.stripeError is already set reactively
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <pv-dialog
    :visible="visible"
    :header="t('profile.updateCard')"
    :modal="true"
    :draggable="false"
    style="width: 420px; max-width: 95vw"
    @update:visible="handleClose"
  >
    <div class="card-form">
      <!-- Cardholder name stays in our DOM — not sensitive -->
      <div class="card-form__field">
        <label class="card-form__label" for="upm-name">{{ t('checkout.cardholderName') }}</label>
        <pv-input-text
          id="upm-name"
          v-model="cardholderName"
          autocomplete="cc-name"
          :aria-label="t('checkout.cardholderName')"
          :invalid="!!nameError"
          @input="nameError = ''"
        />
        <small v-if="nameError" class="card-form__error" role="alert">{{ nameError }}</small>
      </div>

      <!-- Stripe CardElement: number + expiry + CVC in one secure iframe -->
      <div class="card-form__field">
        <label class="card-form__label">{{ t('checkout.cardNumber') }}</label>
        <div
          ref="cardElementRef"
          class="stripe-card-element"
          :class="{ 'stripe-card-element--error': stripeCard.stripeError.value }"
          aria-label="Card number, expiry, and CVC"
        />
        <small v-if="stripeCard.stripeError.value" class="card-form__error" role="alert">
          {{ stripeCard.stripeError.value }}
        </small>
      </div>

      <p class="card-form__notice">
        <i class="pi pi-lock" aria-hidden="true" />
        {{ t('checkout.secureNotice') }}
      </p>
    </div>

    <template #footer>
      <pv-button
        :label="t('common.cancel')"
        severity="secondary"
        text
        :disabled="loading || stripeCard.stripeLoading.value"
        :aria-label="t('common.cancel')"
        @click="handleClose"
      />
      <pv-button
        :label="t('profile.updateCard')"
        icon="pi pi-check"
        icon-pos="right"
        :loading="loading || stripeCard.stripeLoading.value"
        :aria-label="t('profile.updateCard')"
        @click="handleSubmit"
      />
    </template>
  </pv-dialog>
</template>

<style scoped>
.card-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
}

.card-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-form__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-text);
}

.stripe-card-element {
  padding: 0.65rem 0.875rem;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s;
  min-height: 42px;
}

.stripe-card-element:focus-within {
  border-color: var(--ns-primary);
}

.stripe-card-element--error {
  border-color: var(--ns-danger);
}

.card-form__error {
  color: var(--ns-danger);
  font-size: 0.75rem;
}

.card-form__notice {
  font-size: 0.75rem;
  color: var(--ns-text-muted);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
}
</style>
