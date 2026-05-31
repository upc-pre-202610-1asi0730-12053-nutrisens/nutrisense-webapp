// PATH: src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import { useIamStore } from './app/iam/application/iam.store.js'
import { iamRoutes, onboardingRoute } from './app/iam/presentation/routes/iam.routes.js'
import { analyticsReportingRoutes } from './app/analytics-reporting/presentation/routes/analytics-reporting.routes.js'
import { nutritionTrackingRoutes } from './app/nutrition-tracking/presentation/routes/nutrition-tracking.routes.js'
import { bodyHealthMetricsRoutes } from './app/body-health-metrics/presentation/routes/body-health-metrics.routes.js'
import { activityWearableRoutes } from './app/activity-wearable/presentation/routes/activity-wearable.routes.js'
import { smartRecommendationsRoutes } from './app/smart-recommendations/presentation/routes/smart-recommendations.routes.js'
import { subscriptionsBillingRoutes, planSelectionRoute } from './app/subscriptions-billing/presentation/routes/subscriptions-billing.routes.js'

const authRoutes   = iamRoutes.filter(r => r.meta?.requiresGuest)
const profileRoute = iamRoutes.find(r => r.name === 'profile')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app/dashboard' },
    ...authRoutes,
    onboardingRoute,
    planSelectionRoute,
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

router.beforeEach(async (to, _from) => {
  if (to.meta?.title) document.title = to.meta.title

  const userId = localStorage.getItem('ns_user_id')

  if (to.meta?.requiresAuth && !userId) return { name: 'login' }
  if (to.meta?.requiresGuest && userId) return { name: 'dashboard' }

  if (userId && to.meta?.requiresAuth) {
    const iamStore = useIamStore()
    if (!iamStore.userLoaded) await iamStore.fetchCurrentUser(userId)

    const user = iamStore.currentUser
    if (user && !user.isOnboardingComplete() && to.name !== 'onboarding') {
      return { name: 'onboarding' }
    }
    if (user && user.isOnboardingComplete() && to.name === 'onboarding') {
      return { name: 'dashboard' }
    }
  }
})

export default router
