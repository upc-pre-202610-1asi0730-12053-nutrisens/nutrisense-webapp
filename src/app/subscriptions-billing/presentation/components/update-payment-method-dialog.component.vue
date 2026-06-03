<!-- PATH: src/app/subscriptions-billing/presentation/components/update-payment-method-dialog.component.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PaymentMethod } from '../../domain/model/payment-method.entity.js'

const { t } = useI18n()

const props = defineProps({
  visible: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'submit'])

const cardNumber = ref('')
const cardholderName = ref('')
const expiry = ref('')
const cvv = ref('')

/** @type {import('vue').Ref<Record<string, string>>} */
const fieldErrors = ref({})

const detectedBrand = computed(() => PaymentMethod.detectBrand(cardNumber.value))

watch(() => props.visible, (val) => {
  if (val) {
    cardNumber.value = ''
    cardholderName.value = ''
    expiry.value = ''
    cvv.value = ''
    fieldErrors.value = {}
  }
})

/** @param {Event} e */
function onCardInput(e) {
  const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
  cardNumber.value = raw.replace(/(.{4})/g, '$1 ').trim()
}

/** @param {Event} e */
function onExpiryInput(e) {
  let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
  if (raw.length > 2) raw = raw.slice(0, 2) + '/' + raw.slice(2)
  expiry.value = raw
}

function validate() {
  const errors = {}
  const digits = cardNumber.value.replace(/\D/g, '')
  if (digits.length !== 16) errors.cardNumber = t('checkout.errorCardNumber')

  const [mm, yy] = expiry.value.split('/')
  const month = parseInt(mm, 10)
  const year = 2000 + parseInt(yy ?? '0', 10)
  const now = new Date()
  if (!mm || !yy || month < 1 || month > 12 || year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)) {
    errors.expiry = t('checkout.errorExpiry')
  }

  const isAmex = detectedBrand.value === 'amex'
  if (cvv.value.replace(/\D/g, '').length < (isAmex ? 4 : 3)) {
    errors.cvv = t('checkout.errorCvv')
  }

  if (!cardholderName.value.trim()) errors.cardholderName = t('checkout.errorName')

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  const [mm, yy] = expiry.value.split('/')
  emit('submit', {
    cardNumber: cardNumber.value.replace(/\D/g, ''),
    cardholderName: cardholderName.value.trim(),
    expiryMonth: parseInt(mm, 10),
    expiryYear: 2000 + parseInt(yy, 10),
    cvv: cvv.value,
  })
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
      <div class="card-form__field">
        <label class="card-form__label" for="upm-card-number">{{ t('checkout.cardNumber') }}</label>
        <div class="card-form__input-wrap">
          <pv-input-text
            id="upm-card-number"
            :value="cardNumber"
            inputmode="numeric"
            maxlength="19"
            :placeholder="'1234 5678 9012 3456'"
            :aria-label="t('checkout.cardNumber')"
            :invalid="!!fieldErrors.cardNumber"
            @input="onCardInput"
          />
          <span v-if="detectedBrand !== 'other'" class="card-form__brand" :aria-label="detectedBrand">
            <i :class="detectedBrand === 'visa' ? 'pi pi-credit-card' : 'pi pi-credit-card'" aria-hidden="true" />
            {{ detectedBrand }}
          </span>
        </div>
        <small v-if="fieldErrors.cardNumber" class="card-form__error" role="alert">{{ fieldErrors.cardNumber }}</small>
      </div>

      <div class="card-form__field">
        <label class="card-form__label" for="upm-name">{{ t('checkout.cardholderName') }}</label>
        <pv-input-text
          id="upm-name"
          v-model="cardholderName"
          autocomplete="cc-name"
          :aria-label="t('checkout.cardholderName')"
          :invalid="!!fieldErrors.cardholderName"
        />
        <small v-if="fieldErrors.cardholderName" class="card-form__error" role="alert">{{ fieldErrors.cardholderName }}</small>
      </div>

      <div class="card-form__row">
        <div class="card-form__field">
          <label class="card-form__label" for="upm-expiry">{{ t('checkout.expiry') }}</label>
          <pv-input-text
            id="upm-expiry"
            :value="expiry"
            inputmode="numeric"
            maxlength="5"
            placeholder="MM/YY"
            :aria-label="t('checkout.expiry')"
            :invalid="!!fieldErrors.expiry"
            @input="onExpiryInput"
          />
          <small v-if="fieldErrors.expiry" class="card-form__error" role="alert">{{ fieldErrors.expiry }}</small>
        </div>

        <div class="card-form__field">
          <label class="card-form__label" for="upm-cvv">{{ t('checkout.cvv') }}</label>
          <pv-input-text
            id="upm-cvv"
            v-model="cvv"
            inputmode="numeric"
            :maxlength="detectedBrand === 'amex' ? 4 : 3"
            placeholder="CVV"
            :aria-label="t('checkout.cvv')"
            :invalid="!!fieldErrors.cvv"
          />
          <small v-if="fieldErrors.cvv" class="card-form__error" role="alert">{{ fieldErrors.cvv }}</small>
        </div>
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
        :disabled="loading"
        :aria-label="t('common.cancel')"
        @click="handleClose"
      />
      <pv-button
        :label="t('profile.updateCard')"
        icon="pi pi-check"
        icon-pos="right"
        :loading="loading"
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
  flex: 1;
}

.card-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.card-form__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-text);
}

.card-form__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.card-form__input-wrap .p-inputtext {
  width: 100%;
  padding-right: 5rem;
}

.card-form__brand {
  position: absolute;
  right: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ns-text-muted);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  pointer-events: none;
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
