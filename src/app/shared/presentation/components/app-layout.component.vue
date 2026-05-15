<!-- PATH: src/app/shared/presentation/components/app-layout.component.vue -->
<script setup>
import { ref, computed, onMounted, toRefs } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useIamStore } from '../../../iam/application/iam.store.js'
import LanguageSwitcher from './language-switcher.component.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const iamStore = useIamStore()
const { currentUser } = toRefs(iamStore)

const collapsed = ref(false)

const navItems = [
  { section: 'main',  icon: 'pi pi-th-large',  name: 'dashboard',       labelKey: 'nav.dashboard',       captionKey: 'nav.caption.dashboard' },
  { section: 'main',  icon: 'pi pi-book',       name: 'nutrition-log',   labelKey: 'nav.nutritionLog',    captionKey: 'nav.caption.nutritionLog' },
  { section: 'main',  icon: 'pi pi-star',       name: 'recommendations', labelKey: 'nav.recommendations', captionKey: 'nav.caption.recommendations' },
  { section: 'tools', icon: 'pi pi-chart-line', name: 'body-progress',   labelKey: 'nav.bodyProgress',    captionKey: 'nav.caption.bodyProgress' },
  { section: 'tools', icon: 'pi pi-bolt',       name: 'activity',        labelKey: 'nav.activity',        captionKey: 'nav.caption.activity' },
  { section: 'tools', icon: 'pi pi-chart-bar',  name: 'analytics',       labelKey: 'nav.analytics',       captionKey: 'nav.caption.analytics' },
]

const profileItem = { icon: 'pi pi-user', name: 'profile', labelKey: 'nav.profile', captionKey: 'nav.caption.profile' }

const mainItems  = computed(() => navItems.filter(i => i.section === 'main'))
const toolsItems = computed(() => navItems.filter(i => i.section === 'tools'))

const firstName = computed(() => currentUser.value?.firstName ?? '')

/**
 * Returns true if the nav item matches the current route.
 * @param {object} item
 * @returns {boolean}
 */
function isActive(item) {
  return route.name === item.name || route.path.startsWith(`/app/${item.name}`)
}

function toggleCollapsed() { collapsed.value = !collapsed.value }

/**
 * Navigates to the given route name.
 * @param {string} routeName
 */
function navigateTo(routeName) { router.push({ name: routeName }) }

function signOut() {
  iamStore.signOut()
  localStorage.removeItem('ns_user_id')
  router.push({ name: 'login' })
}

onMounted(() => {
  const userId = localStorage.getItem('ns_user_id')
  if (userId && !currentUser.value) iamStore.fetchCurrentUser(userId)
})
</script>

<template>
  <pv-toast />
  <pv-confirm-dialog />

  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <!-- SIDEBAR -->
    <aside
      class="sidebar"
      :style="{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)' }"
      aria-label="Main navigation"
    >
      <!-- Header -->
      <div class="sidebar-header">
        <div v-if="!collapsed" class="sidebar-logo-wrap">
          <img src="/favicon.svg" class="sidebar-logo-img" alt="" aria-hidden="true" />
          <span class="sidebar-logo">NutriSense</span>
        </div>
        <button class="sidebar-toggle" :aria-label="t('common.close')" @click="toggleCollapsed">
          <i class="pi pi-bars" />
        </button>
      </div>

      <nav>
        <!-- MAIN section -->
        <div v-if="!collapsed" class="sidebar-section-label">MAIN</div>
        <button
          v-for="item in mainItems"
          :key="item.name"
          class="sidebar-nav-item"
          :class="{ active: isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="navigateTo(item.name)"
        >
          <i :class="item.icon" class="sidebar-nav-icon" aria-hidden="true" />
          <div v-if="!collapsed" class="sidebar-nav-text">
            <span class="sidebar-nav-primary">{{ t(item.labelKey) }}</span>
            <span class="sidebar-nav-caption">{{ t(item.captionKey) }}</span>
          </div>
        </button>

        <!-- TOOLS section -->
        <div v-if="!collapsed" class="sidebar-section-label">TOOLS</div>
        <button
          v-for="item in toolsItems"
          :key="item.name"
          class="sidebar-nav-item"
          :class="{ active: isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="navigateTo(item.name)"
        >
          <i :class="item.icon" class="sidebar-nav-icon" aria-hidden="true" />
          <div v-if="!collapsed" class="sidebar-nav-text">
            <span class="sidebar-nav-primary">{{ t(item.labelKey) }}</span>
            <span class="sidebar-nav-caption">{{ t(item.captionKey) }}</span>
          </div>
        </button>
      </nav>

      <div class="sidebar-spacer" />

      <!-- Profile + Sign Out -->
      <div class="sidebar-footer">
        <LanguageSwitcher v-if="!collapsed" variant="dark" />
        <button
          class="sidebar-nav-item"
          :class="{ active: isActive(profileItem) }"
          :aria-current="isActive(profileItem) ? 'page' : undefined"
          @click="navigateTo(profileItem.name)"
        >
          <i :class="profileItem.icon" class="sidebar-nav-icon" aria-hidden="true" />
          <div v-if="!collapsed" class="sidebar-nav-text">
            <span class="sidebar-nav-primary">{{ t(profileItem.labelKey) }}</span>
            <span class="sidebar-nav-caption">{{ t(profileItem.captionKey) }}</span>
          </div>
        </button>
        <button
          class="sidebar-nav-item sidebar-signout"
          :aria-label="t('nav.signOut')"
          role="button"
          @click="signOut"
        >
          <i class="pi pi-sign-out sidebar-nav-icon" aria-hidden="true" />
          <span v-if="!collapsed" class="sidebar-nav-primary">{{ t('nav.signOut') }}</span>
        </button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content" role="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-sidebar-bg);
  min-height: 100vh;
  transition: width 0.2s ease;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  box-shadow: 2px 0 12px rgba(0,0,0,0.10);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.875rem;
  min-height: 3.5rem;
}

.sidebar-logo-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-logo-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.sidebar-logo {
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 1.0625rem;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-sidebar-text);
  font-size: 1.1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
}


.sidebar-section-label {
  color: rgba(255,255,255,0.4);
  font-size: 0.6625rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  padding: 0.875rem 1.25rem 0.3rem;
  white-space: nowrap;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: calc(100% - 1rem);
  margin: 0.125rem 0.5rem;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
  color: var(--color-sidebar-text);
}

.sidebar-nav-item:hover {
  background: rgba(255,255,255,0.15);
}

.sidebar-nav-item.active {
  background: rgba(255,255,255,0.95);
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
}

.sidebar-nav-item.active .sidebar-nav-icon {
  color: var(--color-primary);
}

.sidebar-nav-item.active .sidebar-nav-primary {
  color: var(--color-primary);
  font-weight: 600;
}

.sidebar-nav-item.active .sidebar-nav-caption {
  color: var(--color-primary);
  opacity: 0.65;
}

.sidebar-nav-icon {
  font-size: 1.1rem;
  min-width: 1.1rem;
  color: var(--color-sidebar-text);
}

.sidebar-nav-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-nav-primary {
  color: var(--color-sidebar-text);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.sidebar-nav-caption {
  color: var(--color-sidebar-text-muted);
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-spacer { flex-grow: 1; }

.sidebar-footer {
  padding-bottom: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.12);
  padding-top: 0.5rem;
}

.sidebar-signout .sidebar-nav-icon,
.sidebar-signout .sidebar-nav-primary {
  color: rgba(255,255,255,0.45);
}

.sidebar-signout:hover .sidebar-nav-icon,
.sidebar-signout:hover .sidebar-nav-primary {
  color: rgba(255,255,255,0.9);
}

.main-content {
  margin-left: var(--sidebar-width-expanded);
  flex: 1;
  padding: 2rem 2.25rem;
  transition: margin-left 0.2s ease;
  min-height: 100vh;
  background: var(--color-bg);
}

.sidebar-collapsed .main-content {
  margin-left: var(--sidebar-width-collapsed);
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .app-shell:not(.sidebar-collapsed) .sidebar {
    transform: translateX(0);
  }
  .main-content {
    margin-left: 0 !important;
    padding: 1rem;
  }
}
</style>
