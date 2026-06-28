<!-- PATH: src/app/subscriptions-billing/presentation/views/subscribe.view.vue -->
<!--
  Entry point for the website deep-link `/subscribe?plan=<key>`.
  This view is effectively a routing hop: the global guard resolves where the
  user should go (register / checkout / plan-selection / dashboard) and
  redirects before this renders. The spinner only shows if the redirect is
  briefly in flight.
-->
<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="subscribe-page" role="main">
    <i class="pi pi-spin pi-spinner subscribe-page__icon" aria-hidden="true" />
    <p class="subscribe-page__text">{{ t('common.loading') }}</p>
  </div>
</template>

<style scoped>
.subscribe-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: #f9fafb;
}

.subscribe-page__icon {
  font-size: 2rem;
  color: var(--color-primary);
}

.subscribe-page__text {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
