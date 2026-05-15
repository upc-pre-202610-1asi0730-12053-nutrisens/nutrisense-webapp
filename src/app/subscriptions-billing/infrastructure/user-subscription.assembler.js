import { UserSubscription } from '../domain/model/user-subscription.entity.js'

export class UserSubscriptionAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof UserSubscription>|null}
   */
  static toEntityFromResource(resource) {
    try {
      const planId = resource.planId ?? resource.plan?.id ?? null

      return UserSubscription({
        id: resource.id,
        userId: resource.userId,
        planId,
        status: resource.status,
        billingPeriod: resource.billingPeriod ?? null,
        periodStart: resource.periodStart ?? null,
        periodEnd: resource.periodEnd ?? null,
        cancelAtPeriodEnd: resource.cancelAtPeriodEnd ?? false,
        stripeSubscriptionId: resource.stripeSubscriptionId ?? null,
      })
    } catch (e) {
      console.error('[UserSubscriptionAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof UserSubscription>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => UserSubscriptionAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof UserSubscription>|null}
   */
  static toEntityFromResponse(response) {
    return UserSubscriptionAssembler.toEntityFromResource(response.data)
  }
}
