<!-- PATH: src/app/subscriptions-billing/presentation/components/plan-card.component.vue -->
<script setup>
import { useI18n } from 'vue-i18n'
import { featureLabel as resolveFeatureLabel } from '../feature-i18n.js'

const props = defineProps({
  plan: { type: Object, required: true },
  isCurrentPlan: { type: Boolean, default: false },
  billingPeriod: { type: String, default: 'monthly' },
  isChanging: { type: Boolean, default: false },
  isUpgrade: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})

/** @type {(event: 'select', planKey: string) => void} */
const emit = defineEmits(['select'])
const { t } = useI18n()

/** @param {string} featureId */
function featureLabel(featureId) {
  return resolveFeatureLabel(t, featureId)
}

/**
 * Returns the formatted price string for the current billing period.
 * Uses priceAnnual from the backend when available; falls back to 80% of monthly × 12.
 * @returns {string}
 */
function getPrice() {
  if (props.billingPeriod === 'annual') {
    const annual = props.plan.priceAnnual ?? props.plan.priceMonthly * 12 * 0.8
    return `$${(annual / 12).toFixed(2)}${t('subscription.perMonth')}`
  }
  return `$${props.plan.priceMonthly.toFixed(2)}${t('subscription.perMonth')}`
}
</script>

<template>
  <div
    class="plan-card"
    :class="{ 'plan-card--current': isCurrentPlan }"
    role="article"
  >
    <div class="plan-card__header">
      <span class="plan-card__name">{{ t(plan.key) }}</span>
      <pv-tag v-if="isCurrentPlan" :value="t('subscription.active')" severity="success" />
    </div>

    <div class="plan-card__price">{{ getPrice() }}</div>

    <ul class="plan-card__features" :aria-label="t('subscription.features')">
      <li v-for="feature in plan.features" :key="feature" class="plan-card__feature">
        <i class="pi pi-check plan-card__check" aria-hidden="true" />
        {{ featureLabel(feature) }}
      </li>
    </ul>

    <pv-button
      v-if="!isCurrentPlan"
      :label="isChanging ? '' : isUpgrade ? t('subscription.upgrade') : t('subscription.downgrade')"
      :icon="isChanging ? 'pi pi-spin pi-spinner' : isUpgrade ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"
      :icon-pos="isChanging ? 'left' : 'right'"
      class="w-full"
      :disabled="isChanging || disabled"
      :aria-label="`${isUpgrade ? t('subscription.upgrade') : t('subscription.downgrade')} ${t(plan.key)}`"
      @click="emit('select', plan.key)"
    />
    <pv-button
      v-else
      :label="t('subscription.active')"
      icon="pi pi-check"
      icon-pos="right"
      class="w-full"
      disabled
    />
  </div>
</template>

<style scoped>
.plan-card {
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  padding: 1.25rem;
  border: 2px solid var(--ns-border-light);
  box-shadow: var(--ns-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color var(--ns-transition), box-shadow var(--ns-transition);
}

.plan-card--current {
  border-color: var(--ns-primary);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.plan-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-card__name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ns-text);
}

.plan-card__price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ns-primary-dark);
}

.plan-card__features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-card__feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ns-text-secondary);
  text-transform: capitalize;
}

.plan-card__check {
  color: var(--ns-primary);
  font-size: 0.875rem;
  flex-shrink: 0;
}
</style>
