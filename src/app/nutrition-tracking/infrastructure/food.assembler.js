import { Food } from '../domain/model/food.entity.js'

export class FoodAssembler {
  /**
   * Resolves a food's display name for the given locale, falling back across the
   * available fields so the UI always has a readable label.
   * @param {Object} resource
   * @param {string} [locale]
   * @returns {string}
   */
  static resolveName(resource, locale = 'en') {
    const localized = locale?.startsWith('es') ? resource.nameEs : resource.nameEn
    return localized ?? resource.name ?? resource.nameEn ?? resource.key ?? ''
  }

  /**
   * @param {Object} resource
   * @param {string} [locale]
   * @returns {ReturnType<typeof Food>|null}
   */
  static toEntityFromResource(resource, locale = 'en') {
    try {
      return Food({
        id: resource.id,
        key: resource.key,
        name: FoodAssembler.resolveName(resource, locale),
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
   * @param {string} [locale]
   * @returns {ReturnType<typeof Food>[]}
   */
  static toEntitiesFromResponse(response, locale = 'en') {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => FoodAssembler.toEntityFromResource(r, locale)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @param {string} [locale]
   * @returns {ReturnType<typeof Food>|null}
   */
  static toEntityFromResponse(response, locale = 'en') {
    return FoodAssembler.toEntityFromResource(response.data, locale)
  }
}
