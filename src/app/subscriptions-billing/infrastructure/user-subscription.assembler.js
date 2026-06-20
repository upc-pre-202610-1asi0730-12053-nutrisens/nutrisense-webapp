import { UserSubscription } from '../domain/model/user-subscription.entity.js'

export class UserSubscriptionAssembler {
  /**
   * @param {Object} resource - camelCased backend UserSubscriptionResource
   * @returns {ReturnType<typeof UserSubscription>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return UserSubscription({
        id: resource.id,
        userId: resource.userId,
        planId: resource.planId,
        planKey: resource.planKey,
        status: resource.status,
        billingPeriod: resource.billingPeriod ?? null,
        periodStart: resource.periodStart ?? null,
        periodEnd: resource.periodEnd ?? null,
        cancelAtPeriodEnd: resource.cancelAtPeriodEnd ?? false,
        stripeSubscriptionId: resource.stripeSubscriptionId ?? null,
        lastPlanChangeAt: resource.lastPlanChangeAt ?? null,
        paymentMethodId: resource.paymentMethodId ?? null,
      })
    } catch (e) {
      console.error('[UserSubscriptionAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof UserSubscription>|null}
   */
  static toEntityFromResponse(response) {
    return UserSubscriptionAssembler.toEntityFromResource(response.data)
  }
}
