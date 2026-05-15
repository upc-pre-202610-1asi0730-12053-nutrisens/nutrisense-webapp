// PATH: src/app/shared/domain/events/event-types.js

/** Emitted by nutrition-tracking after any log mutation. */
export const NUTRITION_LOG_ADDED      = 'nutrition-tracking.log-added'

/** Emitted by body-health-metrics when the active goal's calorie/protein targets change. */
export const GOAL_UPDATED             = 'body-health-metrics.goal-updated'

/** Emitted by body-health-metrics when a weight log mutates the computed BMI. */
export const WEIGHT_UPDATED           = 'body-health-metrics.weight-updated'

/** Emitted by activity-wearable after any activity log mutation. */
export const ACTIVITY_LOGGED          = 'activity-wearable.activity-logged'

/** Emitted by subscriptions-billing after any subscription state change. */
export const SUBSCRIPTION_ACTIVATED   = 'subscriptions-billing.subscription-activated'
