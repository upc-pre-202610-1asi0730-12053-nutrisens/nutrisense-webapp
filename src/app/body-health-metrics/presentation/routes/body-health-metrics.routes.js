// PATH: src/app/body-health-metrics/presentation/routes/body-health-metrics.routes.js

/** @type {import('vue-router').RouteRecordRaw[]} */
export const bodyHealthMetricsRoutes = [
  {
    path: 'body-progress',
    name: 'body-progress',
    component: () => import('../views/body-progress.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Body Progress' },
  },
]
