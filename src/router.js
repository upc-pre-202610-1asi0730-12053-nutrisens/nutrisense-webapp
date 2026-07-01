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
import { subscriptionsBillingRoutes, subscribeRoute, planSelectionRoute, checkoutRoute, paymentSuccessRoute } from './app/subscriptions-billing/presentation/routes/subscriptions-billing.routes.js'
import { isValidPlanTier } from './app/subscriptions-billing/domain/model/plan-tier.record.js'

const authRoutes   = iamRoutes.filter(r => r.meta?.requiresGuest)
const profileRoute = iamRoutes.find(r => r.name === 'profile')

/**
 * Routes reachable by an authenticated user who does NOT yet have an active
 * subscription (the billing flow). Every other authenticated route requires an
 * active subscription. Subscription now comes BEFORE onboarding, so 'onboarding'
 * is intentionally NOT exempt: a user without an active sub who hits /onboarding
 * is sent to plan-selection by the subscription gate.
 * @type {Set<string>}
 */
const SUBSCRIPTION_EXEMPT_ROUTES = new Set([
  'plan-selection',
  'checkout',
  'payment-success',
])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app/dashboard' },
    {
      path: '/oauth/health/callback',
      name: 'oauth-health-callback',
      component: () => import('./app/activity-wearable/presentation/views/oauth-health-callback.view.vue'),
    },
    ...authRoutes,
    subscribeRoute,
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

  // Website deep-link: /subscribe?plan=<key>. Resolve the right destination
  // based on session + subscription state, preserving the chosen plan.
  if (to.name === 'subscribe') {
    const plan = isValidPlanTier(to.query.plan) ? to.query.plan : null
    // No valid session → registration (team decision), keeping the plan so it
    // survives auth. The register/login link will forward `plan` to checkout.
    if (!userId || !isTokenValid(token)) {
      if (token) clearSession()
      return { name: 'register', query: plan ? { plan } : {} }
    }
    const iamStore = useIamStore()
    if (!iamStore.currentUser) await iamStore.fetchCurrentUser(parseInt(userId, 10))
    const billingStore = useSubscriptionsBillingStore()
    if (!billingStore.subscriptionLoaded || billingStore.loadedForUserId !== String(userId)) {
      await billingStore.checkSubscription(userId)
    }
    // Already subscribed → straight to the app; otherwise to checkout (valid
    // plan) or plan-selection (no/invalid plan).
    if (billingStore.subscription?.isActive()) return { name: 'dashboard' }
    if (plan) return { name: 'checkout', query: { planKey: plan } }
    return { name: 'plan-selection' }
  }

  if (userId && to.meta?.requiresAuth) {
    const iamStore = useIamStore()
    if (!iamStore.currentUser) await iamStore.fetchCurrentUser(parseInt(userId, 10))

    const user = iamStore.currentUser
    const billingStore = useSubscriptionsBillingStore()
    // Idempotently loads subscription status for the current user.
    const ensureSubscriptionLoaded = async () => {
      if (!billingStore.subscriptionLoaded || billingStore.loadedForUserId !== String(userId)) {
        await billingStore.checkSubscription(userId)
      }
    }

    // Core-app gate, in the new order: subscription FIRST, onboarding SECOND.
    // Billing-flow routes (plan-selection/checkout/payment-success) are exempt
    // so the user can reach checkout and SEE payment-success before onboarding.
    if (user && !SUBSCRIPTION_EXEMPT_ROUTES.has(to.name)) {
      await ensureSubscriptionLoaded()
      // 1. Subscription gate: no active sub → choose a plan first.
      if (!billingStore.subscription?.isActive()) return { name: 'plan-selection' }
      // 2. Onboarding gate: only once the user already has an active sub.
      if (!user.isOnboardingComplete() && to.name !== 'onboarding') {
        return { name: 'onboarding' }
      }
    }
    // Don't let a fully-onboarded user revisit onboarding.
    if (user && user.isOnboardingComplete() && to.name === 'onboarding') {
      return { name: 'dashboard' }
    }

    // Fine-grained checks for the billing-flow routes (preserved).
    if (to.name === 'plan-selection') {
      await ensureSubscriptionLoaded()
      if (billingStore.subscription?.isActive()) return { name: 'dashboard' }
    }

    if (to.name === 'checkout') {
      if (!to.query.planKey) return { name: 'plan-selection' }
      await ensureSubscriptionLoaded()
      if (billingStore.subscription?.isActive()) return { name: 'dashboard' }
    }

    if (to.name === 'payment-success') {
      if (!billingStore.lastPaymentMethod) return { name: 'dashboard' }
    }
  }
})

export default router
