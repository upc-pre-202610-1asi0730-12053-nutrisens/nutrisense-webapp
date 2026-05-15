// PATH: src/app/subscriptions-billing/presentation/routes/subscriptions-billing.routes.js

/** Standalone top-level route shown after onboarding. Not inside app-layout. */
export const planSelectionRoute = {
  path: '/plan-selection',
  name: 'plan-selection',
  component: () => import('../views/plan-selection.view.vue'),
  meta: { requiresAuth: true, title: 'NutriSense — Choose Your Plan' },
}

/** Child routes injected into the /profile shell (owned by this bounded context). */
export const subscriptionsBillingProfileChildren = [
  {
    path: 'billing',
    name: 'profile-billing',
    component: () => import('../views/profile-billing.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Billing' },
  },
]

/** Standalone routes registered under /app. */
export const subscriptionsBillingRoutes = [
  {
    path: 'subscription',
    name: 'profile-subscription',
    component: () => import('../views/subscription.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Subscription' },
  },
  {
    path: 'payment-history',
    name: 'profile-payment-history',
    component: () => import('../views/payment-history.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Payment History' },
  },
]
