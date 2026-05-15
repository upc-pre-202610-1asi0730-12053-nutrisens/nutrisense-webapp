// PATH: src/app/activity-wearable/presentation/routes/activity-wearable.routes.js
export const activityWearableRoutes = [
  {
    path: 'activity',
    name: 'activity',
    component: () => import('../views/activity.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Activity' },
  },
  {
    path: 'activity/history',
    name: 'activity-history',
    component: () => import('../views/activity-history.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Activity History' },
  },
]
