// PATH: src/app/smart-recommendations/presentation/routes/smart-recommendations.routes.js
export const smartRecommendationsRoutes = [
  {
    path: 'recommendations',
    name: 'recommendations',
    component: () => import('../views/recommendations.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Recommendations' },
  },
]
