<!-- PATH: src/app/activity-wearable/presentation/views/oauth-health-callback.view.vue -->
<!-- OAuth2 redirect target (same-tab flow). Validates the CSRF state, exchanges the
     authorization code via the store, then returns to the activity view signalling
     the outcome through a query param so it can show a toast. -->
<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { consumeOAuthState } from '../../infrastructure/oauth-health.js'
import { useActivityWearableStore } from '../../application/activity-wearable.store.js'

const { t } = useI18n()
const router = useRouter()
const store = useActivityWearableStore()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const userId = localStorage.getItem('ns_user_id') ?? ''

  if (error || !code || !consumeOAuthState(state)) {
    router.replace({ name: 'activity', query: { health: 'error' } })
    return
  }

  try {
    if (userId) await store.connectHealth(userId, { oauthCode: code })
    router.replace({ name: 'activity', query: { health: 'connected' } })
  } catch {
    router.replace({ name: 'activity', query: { health: 'error' } })
  }
})
</script>

<template>
  <div class="oauth-callback">
    <pv-progress-spinner style="width: 48px; height: 48px" stroke-width="4" />
    <p>{{ t('activity.health.connecting') }}</p>
  </div>
</template>

<style scoped>
.oauth-callback {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--ns-text-muted, #6b7280);
}
</style>
