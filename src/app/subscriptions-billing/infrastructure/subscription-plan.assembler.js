import { SubscriptionPlan } from '../domain/model/subscription-plan.entity.js'

export class SubscriptionPlanAssembler {
  /**
   * @param {Object} resource - camelCased backend SubscriptionPlanResource
   * @returns {ReturnType<typeof SubscriptionPlan>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return SubscriptionPlan({
        id: resource.id,
        key: resource.key,
        priceMonthly: resource.priceMonthly,
        priceAnnual: resource.priceAnnual ?? null,
        currency: resource.currency ?? 'USD',
        features: resource.features ?? [],
      })
    } catch (e) {
      console.error('[SubscriptionPlanAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof SubscriptionPlan>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => SubscriptionPlanAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof SubscriptionPlan>|null}
   */
  static toEntityFromResponse(response) {
    return SubscriptionPlanAssembler.toEntityFromResource(response.data)
  }
}
