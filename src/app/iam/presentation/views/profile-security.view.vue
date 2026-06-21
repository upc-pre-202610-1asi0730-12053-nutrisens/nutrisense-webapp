<!-- PATH: src/app/iam/presentation/views/profile-security.view.vue -->
<script setup>
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import { backendMessage } from '../../../shared/infrastructure/api-error.js'
import { useIamStore } from '../../application/iam.store.js'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const iamStore = useIamStore()
const { userLoaded } = toRefs(iamStore)

/* ── Change password ── */
const pwForm = ref({ current: '', next: '', confirm: '' })
const pwError = ref('')
const showCurrentPw = ref(false)
const showNextPw    = ref(false)

/** Validates and submits the password change form. */
function handleChangePassword() {
  pwError.value = ''
  if (pwForm.value.next !== pwForm.value.confirm) {
    pwError.value = t('auth.register.passwordMismatch')
    return
  }
  toast.add({ severity: 'success', summary: t('profile.passwordChanged'), life: 3000 })
  pwForm.value = { current: '', next: '', confirm: '' }
}

/* ── Delete account ── */
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
/**
 * Returns true only when the user has typed the exact confirmation string.
 * @returns {boolean}
 */
const canDelete = () => deleteConfirmText.value === 'DELETE'

/**
 * Calls DELETE /users/{id} via the store, then redirects to login.
 * Only proceeds if canDelete() is true.
 */
function handleDeleteAccount() {
  if (!canDelete()) return
  iamStore.deleteAccount()
    .then(() => router.push({ name: 'login' }))
    .catch(err => {
      toast.add({ severity: 'error', summary: backendMessage(err) ?? t('common.error'), life: 3000 })
    })
}
</script>

<template>
  <div class="security-view">
    <h2 class="section-title">{{ t('profile.security') }}</h2>

    <pv-skeleton v-if="!userLoaded" height="300px" border-radius="12px" />

    <template v-if="userLoaded">
      <!-- Change password -->
      <pv-card class="mb-3">
        <template #title>{{ t('profile.changePassword') }}</template>
        <template #content>
          <div v-if="pwError" class="text-red-500 mb-2">{{ pwError }}</div>
          <div class="pw-grid">
            <div class="field">
              <label for="sec-cur">{{ t('profile.currentPassword') }}</label>
              <pv-input-text
                id="sec-cur"
                v-model="pwForm.current"
                :type="showCurrentPw ? 'text' : 'password'"
                :aria-label="t('profile.currentPassword')"
                class="w-full"
              />
            </div>
            <div class="field">
              <label for="sec-next">{{ t('profile.newPassword') }}</label>
              <pv-input-text
                id="sec-next"
                v-model="pwForm.next"
                :type="showNextPw ? 'text' : 'password'"
                :aria-label="t('profile.newPassword')"
                class="w-full"
              />
            </div>
            <div class="field">
              <label for="sec-confirm">{{ t('profile.confirmPassword') }}</label>
              <pv-input-text
                id="sec-confirm"
                v-model="pwForm.confirm"
                type="password"
                :aria-label="t('profile.confirmPassword')"
                class="w-full"
              />
            </div>
          </div>
          <div class="actions">
            <pv-button :label="t('profile.changePassword')" icon="pi pi-lock" @click="handleChangePassword" />
          </div>
        </template>
      </pv-card>

      <!-- Danger zone -->
      <pv-card class="danger-card">
        <template #title>
          <span class="danger-title">{{ t('profile.dangerZone') }}</span>
        </template>
        <template #content>
          <p class="danger-desc">{{ t('profile.dangerZoneDesc') }}</p>
          <pv-button
            :label="t('profile.deleteAccount')"
            severity="danger"
            @click="showDeleteDialog = true"
          />
        </template>
      </pv-card>
    </template>

    <!-- Delete account dialog -->
    <pv-dialog
      v-model:visible="showDeleteDialog"
      :header="t('profile.deleteAccountTitle')"
      :modal="true"
      style="width: 420px"
    >
      <p>{{ t('profile.deleteAccountBody') }}</p>
      <p class="mb-1"><strong>{{ t('profile.typeDelete') }}</strong></p>
      <pv-input-text
        v-model="deleteConfirmText"
        :aria-label="t('profile.typeDelete')"
        class="w-full"
      />
      <template #footer>
        <pv-button :label="t('common.cancel')" severity="secondary" text @click="showDeleteDialog = false" />
        <pv-button
          :label="t('profile.deletePermanently')"
          severity="danger"
          :disabled="!canDelete()"
          @click="handleDeleteAccount"
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
.pw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.field label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
}
.actions { display: flex; justify-content: flex-end; }
.danger-card :deep(.p-card-title) { color: var(--color-danger); }
.danger-title { color: var(--color-danger); }
.danger-desc {
  font-size: 0.875rem;
  color: var(--ns-text-secondary);
  margin: 0 0 1rem;
}
.text-secondary { color: var(--ns-text-secondary); font-size: 0.875rem; }
</style>
