// PATH: src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import { useIamStore } from './app/iam/application/iam.store.js'
import { useSubscriptionsBillingStore } from './app/subscriptions-billing/application/subscriptions-billing.store.js'
import { iamRoutes, onboardingRoute } from './app/iam/presentation/routes/iam.routes.js'
import { analyticsReportingRoutes } from './app/analytics-reporting/presentation/routes/analytics-reporting.routes.js'
import { nutritionTrackingRoutes } from './app/nutrition-tracking/presentation/routes/nutrition-tracking.routes.js'
import { bodyHealthMetricsRoutes } from './app/body-health-metrics/presentation/routes/body-health-metrics.routes.js'
import { activityWearableRoutes } from './app/activity-wearable/presentation/routes/activity-wearable.routes.js'
import { smartRecommendationsRoutes } from './app/smart-recommendations/presentation/routes/smart-recommendations.routes.js'
import { subscriptionsBillingRoutes, planSelectionRoute, checkoutRoute, paymentSuccessRoute } from './app/subscriptions-billing/presentation/routes/subscriptions-billing.routes.js'

const authRoutes   = iamRoutes.filter(r => r.meta?.requiresGuest)
const profileRoute = iamRoutes.find(r => r.name === 'profile')

/**
 * Routes reachable by an authenticated user who does NOT yet have an active
 * subscription (the onboarding / billing flow). Every other authenticated
 * route requires an active subscription.
 * @type {Set<string>}
 */
const SUBSCRIPTION_EXEMPT_ROUTES = new Set([
  'onboarding',
  'plan-selection',
  'checkout',
  'payment-success',
])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app/dashboard' },
    ...authRoutes,
    onboardingRoute,
    planSelectionRoute,
    checkoutRoute,
    paymentSuccessRoute,
    {
      path: '/app',
      component: () => import('./app/shared/presentation/components/app-layout.component.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/app/dashboard' },
        ...analyticsReportingRoutes,
        ...nutritionTrackingRoutes,
        ...bodyHealthMetricsRoutes,
        ...activityWearableRoutes,
        ...smartRecommendationsRoutes,
        ...subscriptionsBillingRoutes,
        profileRoute,
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./app/shared/presentation/views/page-not-found.view.vue'),
    },
  ],
})

function parseJwtExp(token) {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)).exp ?? null
  } catch {
    return null
  }
}

function isTokenValid(token) {
  if (!token) return false
  const exp = parseJwtExp(token)
  return exp !== null && Date.now() / 1000 < exp
}

function clearSession() {
  localStorage.removeItem('ns_token')
  localStorage.removeItem('ns_user_id')
  localStorage.removeItem('ns_session_id')
}

router.beforeEach(async (to, _from) => {
  if (to.meta?.title) document.title = to.meta.title

  const token = localStorage.getItem('ns_token')
  const userId = localStorage.getItem('ns_user_id')

  if (to.meta?.requiresAuth && !isTokenValid(token)) {
    clearSession()
    return { name: 'login' }
  }
  if (to.meta?.requiresGuest && isTokenValid(token)) return { name: 'dashboard' }

  if (userId && to.meta?.requiresAuth) {
    const iamStore = useIamStore()
    if (!iamStore.currentUser) await iamStore.fetchCurrentUser(parseInt(userId, 10))

    const user = iamStore.currentUser
    if (user && !user.isOnboardingComplete() && to.name !== 'onboarding') {
      return { name: 'onboarding' }
    }
    if (user && user.isOnboardingComplete() && to.name === 'onboarding') {
      return { name: 'dashboard' }
    }

    if (to.name === 'plan-selection') {
      const billingStore = useSubscriptionsBillingStore()
      if (!billingStore.subscriptionLoaded || billingStore.loadedForUserId !== String(userId)) {
        await billingStore.checkSubscription(userId)
      }
      if (billingStore.subscription?.isActive()) return { name: 'dashboard' }
    }

    if (to.name === 'checkout') {
      if (!to.query.planKey) return { name: 'plan-selection' }
      const billingStore = useSubscriptionsBillingStore()
      if (!billingStore.subscriptionLoaded || billingStore.loadedForUserId !== String(userId)) {
        await billingStore.checkSubscription(userId)
      }
      if (billingStore.subscription?.isActive()) return { name: 'dashboard' }
    }

    if (to.name === 'payment-success') {
      const billingStore = useSubscriptionsBillingStore()
      if (!billingStore.lastPaymentMethod) return { name: 'dashboard' }
    }

    // Subscription gate: the core app requires an active subscription.
    // Exempt the onboarding/billing flow routes (which must stay reachable
    // without one); everything else under requiresAuth is gated.
    if (user && user.isOnboardingComplete() && !SUBSCRIPTION_EXEMPT_ROUTES.has(to.name)) {
      const billingStore = useSubscriptionsBillingStore()
      if (!billingStore.subscriptionLoaded || billingStore.loadedForUserId !== String(userId)) {
        await billingStore.checkSubscription(userId)
      }
      if (!billingStore.subscription?.isActive()) return { name: 'plan-selection' }
    }
  }
})

export default router
