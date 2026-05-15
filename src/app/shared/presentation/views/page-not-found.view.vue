<!-- PATH: src/app/shared/presentation/views/page-not-found.view.vue -->
<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="not-found" role="main">
    <div class="not-found__content">
      <div class="not-found__code">404</div>
      <h1 class="not-found__title">{{ t('notFound.title') }}</h1>
      <p class="not-found__message">{{ t('notFound.message') }}</p>
      <pv-button
        :label="t('notFound.back')"
        icon="pi pi-home"
        :aria-label="t('notFound.back')"
        @click="router.push({ name: 'dashboard' })"
      />
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ns-surface-alt);
  padding: 2rem;
}

.not-found__content {
  text-align: center;
  max-width: 400px;
}

.not-found__code {
  font-size: 7rem;
  font-weight: 800;
  color: var(--ns-primary);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.not-found__title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ns-text);
  margin: 0 0 0.75rem;
}

.not-found__message {
  font-size: 1rem;
  color: var(--ns-text-secondary);
  margin: 0 0 2rem;
}
</style>
