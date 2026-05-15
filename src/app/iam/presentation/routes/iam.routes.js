// PATH: src/app/iam/presentation/routes/iam.routes.js
import { subscriptionsBillingProfileChildren } from '../../../subscriptions-billing/presentation/routes/subscriptions-billing.routes.js'

export const onboardingRoute = {
  path: '/onboarding',
  name: 'onboarding',
  component: () => import('../views/onboarding.view.vue'),
  meta: { requiresAuth: true, title: 'NutriSense — Get Started' },
}

export const iamRoutes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/login.view.vue'),
    meta: { requiresGuest: true, title: 'NutriSense — Sign In' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/register.view.vue'),
    meta: { requiresGuest: true, title: 'NutriSense — Register' },
  },
  {
    path: '/recover-password',
    name: 'recover-password',
    component: () => import('../views/recover-password.view.vue'),
    meta: { requiresGuest: true, title: 'NutriSense — Recover Password' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/reset-password.view.vue'),
    meta: { requiresGuest: true, title: 'NutriSense — Reset Password' },
  },
  {
    path: 'profile',
    name: 'profile',
    component: () => import('../views/profile.view.vue'),
    meta: { requiresAuth: true, title: 'NutriSense — Profile' },
    redirect: { name: 'profile-personal' },
    children: [
      {
        path: 'personal-info',
        name: 'profile-personal',
        component: () => import('../views/profile-personal-info.view.vue'),
        meta: { requiresAuth: true, title: 'NutriSense — Personal Info' },
      },
      {
        path: 'dietary',
        name: 'profile-dietary',
        component: () => import('../views/profile-dietary.view.vue'),
        meta: { requiresAuth: true, title: 'NutriSense — Dietary Restrictions' },
      },
      ...subscriptionsBillingProfileChildren,
      {
        path: 'security',
        name: 'profile-security',
        component: () => import('../views/profile-security.view.vue'),
        meta: { requiresAuth: true, title: 'NutriSense — Security & Privacy' },
      },
    ],
  },
]
