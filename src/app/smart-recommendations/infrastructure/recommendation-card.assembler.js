import { RecommendationCard } from '../domain/model/recommendation-card.entity.js'

export class RecommendationCardAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof RecommendationCard>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return RecommendationCard({
        id: resource.id,
        cityId: resource.cityId,
        weatherType: resource.weatherType,
        goalType: resource.goalType,
        foodId: resource.foodId ?? null,
        customFoodNameKey: resource.customFoodNameKey ?? undefined,
        estimatedCalories: resource.estimatedCalories,
        estimatedProteinG: resource.estimatedProteinG,
        estimatedCarbsG: resource.estimatedCarbsG,
        estimatedFatG: resource.estimatedFatG,
        badge: resource.badge,
        contextLabelKey: resource.contextLabelKey,
        restrictionsConflict: resource.restrictionsConflict ?? [],
      })
    } catch (e) {
      console.error('[RecommendationCardAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof RecommendationCard>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => RecommendationCardAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof RecommendationCard>|null}
   */
  static toEntityFromResponse(response) {
    return RecommendationCardAssembler.toEntityFromResource(response.data)
  }
}
