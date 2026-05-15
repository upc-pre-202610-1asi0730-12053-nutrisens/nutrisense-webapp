// PATH: src/app/analytics-reporting/presentation/routes/analytics-reporting.routes.js

/** @type {import('vue-router').RouteRecordRaw[]} */
export const analyticsReportingRoutes = [
  {
    path: 'dashboard',
    name: 'dashboard',
    component: () => import('../views/dashboard.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Dashboard' },
  },
  {
    path: 'analytics',
    name: 'analytics',
    component: () => import('../views/analytics.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Analytics' },
  },
]
