import { Food } from '../domain/model/food.entity.js'

export class FoodAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof Food>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return Food({
        id: resource.id,
        key: resource.key,
        source: resource.source,
        externalId: resource.externalId ?? null,
        servingSizeG: resource.servingSizeG,
        servingUnit: resource.servingUnit,
        caloriesPer100g: resource.caloriesPer100g,
        proteinPer100g: resource.proteinPer100g,
        carbsPer100g: resource.carbsPer100g,
        fatPer100g: resource.fatPer100g,
        fiberPer100g: resource.fiberPer100g ?? 0,
        sugarPer100g: resource.sugarPer100g ?? 0,
        restrictions: resource.restrictions ?? [],
      })
    } catch (e) {
      console.error('[FoodAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof Food>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => FoodAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof Food>|null}
   */
  static toEntityFromResponse(response) {
    return FoodAssembler.toEntityFromResource(response.data)
  }
}
