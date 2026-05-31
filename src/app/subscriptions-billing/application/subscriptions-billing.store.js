// PATH: src/app/subscriptions-billing/application/subscriptions-billing.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SubscriptionsBillingApi } from '../infrastructure/subscriptions-billing.api.js'
import { UserSubscriptionAssembler } from '../infrastructure/user-subscription.assembler.js'
import { SubscriptionPlanAssembler } from '../infrastructure/subscription-plan.assembler.js'
import { PaymentRecordAssembler } from '../infrastructure/payment-record.assembler.js'
import { PaymentMethodAssembler } from '../infrastructure/payment-method.assembler.js'
import { PlanTier } from '../domain/model/plan-tier.record.js'
import { emit } from '../../shared/infrastructure/event-bus.js'
import { createDomainEvent } from '../../shared/domain/events/domain-event.js'
import { SUBSCRIPTION_ACTIVATED } from '../../shared/domain/events/event-types.js'

const subscriptionsBillingApi = new SubscriptionsBillingApi()

/**
 * Store for user subscriptions, plan catalogue, and payment history.
 */
export const useSubscriptionsBillingStore = defineStore('subscriptions-billing', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user-subscription.entity.js').UserSubscription>|null>} */
  const subscription = ref(null)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/subscription-plan.entity.js').SubscriptionPlan>[]>} */
  const plans = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/payment-record.entity.js').PaymentRecord>[]>} */
  const paymentHistory = ref([])
  const subscriptionLoaded = ref(false)
  const plansLoaded = ref(false)
  const paymentHistoryLoaded = ref(false)
  /** @type {import('vue').Ref<string|null>} */
  const changingPlanId = ref(null)
  const paymentProcessing = ref(false)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/payment-method.entity.js').PaymentMethod>|null>} */
  const lastPaymentMethod = ref(null)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])

  /**
   * The user's current subscription plan entity.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/subscription-plan.entity.js').SubscriptionPlan>|null>}
   */
  const currentPlan = computed(() => {
    if (!subscription.value) return null
    return plans.value.find(p => p.id === subscription.value.planId) ?? null
  })

  /**
   * The user's current plan tier, derived from the plan ID.
   * @type {import('vue').ComputedRef<ReturnType<typeof PlanTier>|null>}
   */
  const currentTier = computed(() => {
    const plan = currentPlan.value
    if (!plan) return null
    try {
      return PlanTier(plan.id.replace('plan-', ''))
    } catch {
      return null
    }
  })

  /**
   * Whether the subscription is currently active.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isActive = computed(() => subscription.value?.isActive() ?? false)

  /**
   * Whether the subscription is set to cancel at period end.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const willCancelAtPeriodEnd = computed(() =>
    subscription.value?.willCancel() ?? false
  )

  /**
   * Days remaining until the next renewal, or null for free plans.
   * @type {import('vue').ComputedRef<number|null>}
   */
  const daysUntilRenewal = computed(() =>
    subscription.value?.daysUntilRenewal() ?? null
  )

  /**
   * Human-readable renewal date string, or empty string.
   * @type {import('vue').ComputedRef<string>}
   */
  const renewalDateLabel = computed(() => {
    const date = subscription.value?.renewalDate()
    return date ? date.toLocaleDateString() : ''
  })

  /**
   * Returns whether the user has access to a specific feature based on their plan.
   * @param {string} featureName
   * @returns {boolean}
   */
  function hasAccess(featureName) {
    if (!subscription.value) return false
    const plan = plans.value.find(p => p.id === subscription.value.planId)
    return plan?.hasFeature(featureName) ?? false
  }

  /**
   * Checks whether a subscription exists for the given user without provisioning one.
   * Sets subscription state if found.
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  function checkSubscription(userId) {
    return subscriptionsBillingApi.getSubscriptions()
      .then(response => {
        const all = UserSubscriptionAssembler.toEntitiesFromResponse(response)
        const found = all.find(s => s.userId === userId) ?? null
        if (found) {
          subscription.value = found
          subscriptionLoaded.value = true
        }
        return found !== null
      })
      .catch(error => { errors.value.push(error); return false })
  }

  /**
   * Loads the subscription for a given user.
   * If none exists, provisions a basic subscription automatically.
   * @param {string} userId
   */
  function fetchSubscription(userId) {
    subscriptionsBillingApi.getSubscriptions()
      .then(response => {
        const all = UserSubscriptionAssembler.toEntitiesFromResponse(response)
        const found = all.find(s => s.userId === userId) ?? null
        if (found) {
          subscription.value = found
          subscriptionLoaded.value = true
        } else {
          return provisionBasicSubscription(userId)
        }
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates a default basic subscription for a user with no existing record.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  function provisionBasicSubscription(userId) {
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    const resource = {
      userId,
      planId: 'plan-basic',
      status: 'active',
      billingPeriod: 'monthly',
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    }

    return subscriptionsBillingApi.createSubscription(resource)
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        subscriptionLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads all available subscription plans.
   */
  function fetchPlans() {
    subscriptionsBillingApi.getPlans()
      .then(response => {
        plans.value = SubscriptionPlanAssembler.toEntitiesFromResponse(response)
        plansLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads payment history for a given user, sorted most-recent first.
   * @param {string} userId
   */
  function fetchPaymentHistory(userId) {
    subscriptionsBillingApi.getPaymentHistory()
      .then(response => {
        const all = PaymentRecordAssembler.toEntitiesFromResponse(response)
        paymentHistory.value = all
          .filter(p => p.userId === userId)
          .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
        paymentHistoryLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates the initial subscription for a new user with their chosen plan.
   * @param {string} userId
   * @param {string} planId
   * @returns {Promise<void>}
   */
  function selectInitialPlan(userId, planId) {
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)
    return subscriptionsBillingApi.createSubscription({
      userId,
      planId,
      status: 'active',
      billingPeriod: 'monthly',
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        subscriptionLoaded.value = true
        emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Changes the current subscription to a different plan and billing period.
   * @param {string} planId
   * @param {'monthly'|'annual'} billingPeriodValue
   */
  function changePlan(planId, billingPeriodValue) {
    if (!subscription.value) return Promise.resolve()
    changingPlanId.value = planId
    const userId = subscription.value.userId
    const resource = { planId, billingPeriod: billingPeriodValue }
    return subscriptionsBillingApi.updateSubscription(subscription.value.id, resource)
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        if (userId) emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => errors.value.push(error))
      .finally(() => { changingPlanId.value = null })
  }

  /**
   * Schedules the subscription for cancellation at the current period end.
   */
  function cancelSubscription() {
    if (!subscription.value) return
    const userId = subscription.value.userId
    subscriptionsBillingApi.updateSubscription(subscription.value.id, { cancelAtPeriodEnd: true })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        if (userId) emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes the cancellation flag from the current subscription.
   */
  function reactivateSubscription() {
    if (!subscription.value) return
    const userId = subscription.value.userId
    subscriptionsBillingApi.updateSubscription(subscription.value.id, { cancelAtPeriodEnd: false })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        if (userId) emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Processes initial subscription payment in three sequential steps:
   * saves the card as a payment method, creates a paid payment record,
   * then activates the subscription via selectInitialPlan.
   * @param {string} userId
   * @param {string} planId
   * @param {{ cardNumber: string, expiryMonth: number, expiryYear: number, cardholderName: string }} cardData
   * @returns {Promise<void>}
   * @throws {Error} re-thrown after being pushed to errors, so the view can react
   */
  function processPayment(userId, planId, cardData) {
    paymentProcessing.value = true
    const plan = plans.value.find(p => p.id === planId)
    const cardResource = PaymentMethodAssembler.toResource(userId, cardData)

    return subscriptionsBillingApi.createPaymentMethod(cardResource)
      .then(res => {
        lastPaymentMethod.value = PaymentMethodAssembler.toEntityFromResponse(res)
        return subscriptionsBillingApi.createPaymentRecord({
          userId,
          planId,
          amountUsd: plan?.priceMonthly ?? 0,
          status:    'paid',
          paidAt:    new Date().toISOString(),
        })
      })
      .then(() => selectInitialPlan(userId, planId))
      .catch(error => {
        errors.value.push(error)
        throw error
      })
      .finally(() => { paymentProcessing.value = false })
  }

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    subscription,
    plans,
    paymentHistory,
    subscriptionLoaded,
    plansLoaded,
    paymentHistoryLoaded,
    changingPlanId,
    paymentProcessing,
    lastPaymentMethod,
    errors,
    currentPlan,
    currentTier,
    isActive,
    willCancelAtPeriodEnd,
    daysUntilRenewal,
    renewalDateLabel,
    hasAccess,
    checkSubscription,
    fetchSubscription,
    fetchPlans,
    fetchPaymentHistory,
    selectInitialPlan,
    processPayment,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    clearErrors,
  }
})
