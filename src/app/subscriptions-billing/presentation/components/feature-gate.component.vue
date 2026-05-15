<!-- PATH: src/app/subscriptions-billing/presentation/components/feature-gate.component.vue -->
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps({
  /** The feature key to check */
  feature: { type: String, required: true },
  /** Whether the user has access to this feature */
  hasAccess: { type: Boolean, required: true },
  /** Minimum plan required (for display) */
  requiredPlan: { type: String, default: 'pro' },
})

const { t } = useI18n()
const router = useRouter()

const requiredPlanLabel = computed(() => t(`plan.${props.requiredPlan}`))

function goToSubscription() {
  router.push({ name: 'profile-subscription' })
}
</script>

<template>
  <slot v-if="hasAccess" />

  <div v-else class="feature-gate" role="region" :aria-label="t('featureGate.title')">
    <div class="feature-gate__content">
      <i class="pi pi-lock feature-gate__icon" aria-hidden="true" />
      <h3 class="feature-gate__title">{{ t('featureGate.title') }}</h3>
      <p class="feature-gate__message">
        {{ t('featureGate.message', { plan: requiredPlanLabel }) }}
      </p>
      <pv-button
        :label="t('featureGate.upgrade')"
        icon="pi pi-arrow-up"
        @click="goToSubscription"
      />
    </div>
  </div>
</template>

<style scoped>
.feature-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: var(--ns-surface-alt);
  border: 2px dashed var(--ns-border);
  border-radius: var(--ns-radius);
  padding: 2rem;
}

.feature-gate__content {
  text-align: center;
  max-width: 320px;
}

.feature-gate__icon {
  font-size: 2.5rem;
  color: var(--ns-text-muted);
  margin-bottom: 1rem;
}

.feature-gate__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ns-text);
  margin: 0 0 0.5rem;
}

.feature-gate__message {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  margin: 0 0 1.25rem;
}
</style>
