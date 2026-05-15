<!-- PATH: src/app/iam/presentation/views/profile.view.vue -->
<script setup>
import { computed, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../application/iam.store.js'

const { t } = useI18n()
const iamStore = useIamStore()
const { currentUser } = toRefs(iamStore)

/** @type {import('vue').ComputedRef<string>} */
const userInitial = computed(() =>
  currentUser.value?.firstName?.charAt(0).toUpperCase() ?? '?'
)

/** @type {import('vue').ComputedRef<string>} */
const userFullName = computed(() => {
  if (!currentUser.value) return ''
  return [currentUser.value.firstName, currentUser.value.lastName].filter(Boolean).join(' ')
})

const navItems = [
  { labelKey: 'profile.personalInfo',         route: 'profile-personal', icon: 'pi-user-edit' },
  { labelKey: 'profile.dietaryRestrictions',  route: 'profile-dietary',  icon: 'pi-heart' },
  { labelKey: 'profile.billing',              route: 'profile-billing',  icon: 'pi-credit-card' },
  { labelKey: 'profile.security',             route: 'profile-security', icon: 'pi-shield' },
]
</script>

<template>
  <div class="profile-layout">
    <aside class="profile-nav" role="navigation" :aria-label="t('nav.profile')">
      <h2 class="profile-nav__title">{{ t('nav.profile') }}</h2>
      <nav>
        <router-link
          v-for="item in navItems"
          :key="item.route"
          :to="{ name: item.route }"
          class="profile-nav__item"
          active-class="profile-nav__item--active"
          :aria-label="t(item.labelKey)"
        >
          <i :class="['pi', item.icon]" aria-hidden="true" />
          {{ t(item.labelKey) }}
        </router-link>
      </nav>

      <div v-if="userFullName" class="profile-nav__user">
        <div class="profile-nav__avatar" aria-hidden="true">{{ userInitial }}</div>
        <div class="profile-nav__user-info">
          <span class="profile-nav__user-name">{{ userFullName }}</span>
          <span class="profile-nav__user-sub">{{ t('nav.myAccount') }}</span>
        </div>
      </div>
    </aside>

    <div class="profile-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  max-width: 1000px;
}

.profile-nav {
  background: var(--ns-surface);
  border-radius: var(--ns-radius);
  padding: 1.25rem 0.75rem;
  box-shadow: var(--ns-shadow-sm);
  border: 1px solid var(--ns-border-light);
  height: fit-content;
}

.profile-nav__title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ns-text-muted);
  font-weight: 600;
  padding: 0 0.75rem;
  margin: 0 0 0.75rem;
}

.profile-nav__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--ns-radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ns-text-secondary);
  text-decoration: none;
  transition: background var(--ns-transition), color var(--ns-transition);
}

.profile-nav__item:hover {
  background: var(--ns-surface-alt);
  color: var(--ns-text);
}

.profile-nav__item--active {
  background: rgba(80, 139, 137, 0.10);
  color: var(--color-primary-dark);
}

.profile-nav__user {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0.75rem 0.5rem 0.25rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.875rem;
}

.profile-nav__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-nav__user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.profile-nav__user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-nav__user-sub {
  font-size: 0.6875rem;
  color: var(--ns-text-muted);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
  .profile-nav {
    display: flex;
    flex-direction: row;
    gap: 0.25rem;
    overflow-x: auto;
    padding: 0.5rem;
  }
  .profile-nav__title { display: none; }
  .profile-nav__item { white-space: nowrap; flex-shrink: 0; }
}
</style>
