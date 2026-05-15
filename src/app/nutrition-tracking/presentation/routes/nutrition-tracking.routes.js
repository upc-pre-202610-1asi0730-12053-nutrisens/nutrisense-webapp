// PATH: src/app/nutrition-tracking/presentation/routes/nutrition-tracking.routes.js

/** @type {import('vue-router').RouteRecordRaw[]} */
export const nutritionTrackingRoutes = [
  {
    path: 'nutrition-log',
    name: 'nutrition-log',
    component: () => import('../views/nutrition-log.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Nutrition' },
  },
  {
    path: 'scan-dish',
    name: 'scan-dish-result',
    component: () => import('../views/scan-dish-result.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Dish Analysis' },
  },
  {
    path: 'scan-menu',
    name: 'scan-menu-result',
    component: () => import('../views/scan-menu-result.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Menu Analysis' },
  },
]
