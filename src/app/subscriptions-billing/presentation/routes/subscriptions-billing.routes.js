// PATH: src/app/subscriptions-billing/presentation/routes/subscriptions-billing.routes.js

/** @type {import('vue-router').RouteRecordRaw} */
export const planSelectionRoute = {
  path: '/plan-selection',
  name: 'plan-selection',
  component: () => import('../views/plan-selection.view.vue'),
  meta: { requiresAuth: true, title: 'NutriSense — Choose Your Plan' },
}

/** @type {import('vue-router').RouteRecordRaw} */
export const checkoutRoute = {
  path: '/checkout',
  name: 'checkout',
  component: () => import('../views/checkout.view.vue'),
  meta: { requiresAuth: true, title: 'NutriSense — Checkout' },
}

/** @type {import('vue-router').RouteRecordRaw} */
export const paymentSuccessRoute = {
  path: '/payment-success',
  name: 'payment-success',
  component: () => import('../views/payment-confirmation.view.vue'),
  meta: { requiresAuth: true, title: 'NutriSense — Payment Confirmed' },
}

/** @type {import('vue-router').RouteRecordRaw[]} */
export const subscriptionsBillingProfileChildren = [
  {
    path: 'billing',
    name: 'profile-billing',
    component: () => import('../views/profile-billing.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Billing' },
  },
]

/** @type {import('vue-router').RouteRecordRaw[]} */
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
