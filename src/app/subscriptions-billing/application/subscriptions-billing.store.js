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

const api = new SubscriptionsBillingApi()

export const useSubscriptionsBillingStore = defineStore('subscriptions-billing', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user-subscription.entity.js').UserSubscription>|null>} */
  const subscription = ref(null)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/subscription-plan.entity.js').SubscriptionPlan>[]>} */
  const plans = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/payment-record.entity.js').PaymentRecord>[]>} */
  const paymentHistory = ref([])
  const subscriptionLoaded = ref(false)
  /**
   * The userId the subscription state was last loaded for. Used to detect
   * when a different user is active and force a re-check.
   * @type {import('vue').Ref<string|null>}
   */
  const loadedForUserId = ref(null)
  const plansLoaded = ref(false)
  const paymentHistoryLoaded = ref(false)
  /**
   * planKey of the plan currently being changed; null when idle.
   * @type {import('vue').Ref<string|null>}
   */
  const changingPlanId = ref(null)
  const paymentProcessing = ref(false)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/payment-method.entity.js').PaymentMethod>|null>} */
  const lastPaymentMethod = ref(null)
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/payment-method.entity.js').PaymentMethod>|null>} */
  const paymentMethod = ref(null)
  const paymentMethodLoaded = ref(false)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])

  /**
   * The plan entity matching the user's active subscription, looked up by planKey.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/subscription-plan.entity.js').SubscriptionPlan>|null>}
   */
  const currentPlan = computed(() => {
    if (!subscription.value) return null
    return plans.value.find(p => p.key === subscription.value.planKey) ?? null
  })

  /**
   * The user's current plan tier derived from planKey.
   * @type {import('vue').ComputedRef<ReturnType<typeof PlanTier>|null>}
   */
  const currentTier = computed(() => {
    const plan = currentPlan.value
    if (!plan) return null
    try {
      return PlanTier(plan.key)
    } catch {
      return null
    }
  })

  /** @type {import('vue').ComputedRef<boolean>} */
  const isActive = computed(() => subscription.value?.isActive() ?? false)

  /** @type {import('vue').ComputedRef<boolean>} */
  const willCancelAtPeriodEnd = computed(() => subscription.value?.willCancel() ?? false)

  /** @type {import('vue').ComputedRef<number|null>} */
  const daysUntilRenewal = computed(() => subscription.value?.daysUntilRenewal() ?? null)

  /** @type {import('vue').ComputedRef<string>} */
  const renewalDateLabel = computed(() => {
    const date = subscription.value?.renewalDate()
    return date ? date.toLocaleDateString() : ''
  })

  /**
   * @param {string} featureName
   * @returns {boolean}
   */
  function hasAccess(featureName) {
    if (!subscription.value) return false
    const plan = plans.value.find(p => p.key === subscription.value.planKey)
    return plan?.hasFeature(featureName) ?? false
  }

  /**
   * Checks whether a subscription exists for the given user without side effects.
   * @param {number|string} userId
   * @returns {Promise<boolean>}
   */
  function checkSubscription(userId) {
    return api.getSubscriptionByUser(userId)
      .then(response => {
        const found = UserSubscriptionAssembler.toEntityFromResponse(response)
        // Always assign — including null — so a stale subscription from a
        // previous user/session is never carried over.
        subscription.value = found
        subscriptionLoaded.value = true
        loadedForUserId.value = String(userId)
        return found !== null
      })
      .catch(error => {
        subscriptionLoaded.value = true
        loadedForUserId.value = String(userId)
        if (error.response?.status === 404) {
          subscription.value = null
          return false
        }
        errors.value.push(error)
        return false
      })
  }

  /**
   * Loads the subscription for the given user. Payment history is fetched
   * automatically once the subscription ID is available.
   * @param {number|string} userId
   */
  function fetchSubscription(userId) {
    api.getSubscriptionByUser(userId)
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        subscriptionLoaded.value = true
        fetchPaymentHistory()
      })
      .catch(error => {
        if (error.response?.status !== 404) errors.value.push(error)
        subscriptionLoaded.value = true
      })

    fetchPaymentMethod(userId)
  }

  /**
   * Loads the most recent payment method for the given user.
   * NOTE: actual payment method registration is handled in D.7b (Stripe).
   * @param {number|string} userId
   */
  function fetchPaymentMethod(userId) {
    api.getPaymentMethods(userId)
      .then(response => {
        const all = PaymentMethodAssembler.toEntitiesFromResponse(response)
        paymentMethod.value = all.length
          ? all.reduce((latest, m) => m.createdAt > latest.createdAt ? m : latest)
          : null
        paymentMethodLoaded.value = true
      })
      .catch(() => {
        // Payment method is optional — absence is not an error
        paymentMethodLoaded.value = true
      })
  }

  function fetchPlans() {
    api.getPlans()
      .then(response => {
        plans.value = SubscriptionPlanAssembler.toEntitiesFromResponse(response)
        plansLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Fetches payment history using the subscription ID already in state.
   * Safe to call when subscription is not yet loaded — resolves immediately.
   */
  function fetchPaymentHistory() {
    const subscriptionId = subscription.value?.id
    if (!subscriptionId) {
      paymentHistoryLoaded.value = true
      return
    }
    api.getPaymentHistory(subscriptionId)
      .then(response => {
        paymentHistory.value = PaymentRecordAssembler.toEntitiesFromResponse(response)
          .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
        paymentHistoryLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Activates a new subscription for the user on the given plan.
   * paymentMethodId must be a registered payment method ID from the backend.
   * @param {number|string} userId
   * @param {string} planKey  - e.g. "basic" | "pro" | "premium"
   * @param {number} paymentMethodId
   * @param {'monthly'|'annual'} [billingPeriod]
   * @returns {Promise<void>}
   */
  function selectInitialPlan(userId, planKey, paymentMethodId, billingPeriod = 'monthly') {
    return api.selectPlan({ userId: parseInt(userId, 10), planKey, paymentMethodId, billingPeriod })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        subscriptionLoaded.value = true
        emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Upgrades or downgrades the current subscription to a different plan.
   * @param {string} newPlanKey
   * @param {'monthly'|'annual'} billingPeriod
   * @returns {Promise<void>}
   */
  function changePlan(newPlanKey, billingPeriod) {
    if (!subscription.value) return Promise.resolve()

    if (!subscription.value.canChangePlanToday()) {
      const error = new Error('subscription.errorChangeLimitReached')
      errors.value.push(error)
      return Promise.reject(error)
    }

    changingPlanId.value = newPlanKey
    return api.changePlan(subscription.value.id, { newPlanKey, billingPeriod })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
        const userId = subscription.value?.userId
        if (userId) emit(createDomainEvent(SUBSCRIPTION_ACTIVATED, { userId }))
      })
      .catch(error => errors.value.push(error))
      .finally(() => { changingPlanId.value = null })
  }

  /**
   * Schedules the subscription to cancel at the current period end.
   */
  function cancelSubscription() {
    if (!subscription.value) return Promise.resolve()
    return api.cancelSubscription(subscription.value.id, { cancelAtPeriodEnd: true })
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes a pending cancellation and renews the subscription.
   */
  function reactivateSubscription() {
    if (!subscription.value) return Promise.resolve()
    return api.renewSubscription(subscription.value.id)
      .then(response => {
        subscription.value = UserSubscriptionAssembler.toEntityFromResponse(response)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Registers a new card tokenized via Stripe and updates the active payment method.
   * @param {number|string} userId
   * @param {string} stripePaymentMethodId - pm_xxx from stripe.createPaymentMethod()
   * @param {import('../../shared/infrastructure/use-stripe-card.js').CardMeta} cardMeta
   * @returns {Promise<void>}
   */
  function updatePaymentMethod(userId, stripePaymentMethodId, cardMeta) {
    const resource = PaymentMethodAssembler.toResource(userId, stripePaymentMethodId, cardMeta)
    return api.createPaymentMethod(resource)
      .then(res => {
        const updated = PaymentMethodAssembler.toEntityFromResponse(res)
        paymentMethod.value = updated
        lastPaymentMethod.value = updated
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Removes a payment method by id.
   * @param {number} id
   * @returns {Promise<void>}
   */
  function deletePaymentMethod(id) {
    return api.deletePaymentMethod(id)
      .then(() => {
        paymentMethod.value = null
        lastPaymentMethod.value = null
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Processes initial subscription checkout after Stripe tokenisation.
   * Step 1: Register payment method with backend.
   * Step 2: Activate subscription via selectInitialPlan.
   * @param {number|string} userId
   * @param {string} planKey
   * @param {string} stripePaymentMethodId - pm_xxx from stripe.createPaymentMethod()
   * @param {import('../../shared/infrastructure/use-stripe-card.js').CardMeta} cardMeta
   * @param {'monthly'|'annual'} [billingPeriod]
   * @returns {Promise<void>}
   */
  function processPayment(userId, planKey, stripePaymentMethodId, cardMeta, billingPeriod = 'monthly') {
    paymentProcessing.value = true
    const resource = PaymentMethodAssembler.toResource(userId, stripePaymentMethodId, cardMeta)

    return api.createPaymentMethod(resource)
      .then(res => {
        const method = PaymentMethodAssembler.toEntityFromResponse(res)
        lastPaymentMethod.value = method
        paymentMethod.value = method
        return selectInitialPlan(userId, planKey, method.id, billingPeriod)
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
      .finally(() => { paymentProcessing.value = false })
  }

  function clearErrors() {
    errors.value = []
  }

  /**
   * Resets all billing state. Must be called on sign-out / account switch so
   * one user's subscription is never seen by the next user in the same SPA session.
   */
  function reset() {
    subscription.value = null
    plans.value = []
    paymentHistory.value = []
    subscriptionLoaded.value = false
    loadedForUserId.value = null
    plansLoaded.value = false
    paymentHistoryLoaded.value = false
    changingPlanId.value = null
    paymentProcessing.value = false
    lastPaymentMethod.value = null
    paymentMethod.value = null
    paymentMethodLoaded.value = false
    errors.value = []
  }

  return {
    subscription,
    plans,
    paymentHistory,
    subscriptionLoaded,
    loadedForUserId,
    plansLoaded,
    paymentHistoryLoaded,
    changingPlanId,
    paymentProcessing,
    lastPaymentMethod,
    paymentMethod,
    paymentMethodLoaded,
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
    fetchPaymentMethod,
    selectInitialPlan,
    processPayment,
    changePlan,
    updatePaymentMethod,
    deletePaymentMethod,
    cancelSubscription,
    reactivateSubscription,
    clearErrors,
    reset,
  }
})
