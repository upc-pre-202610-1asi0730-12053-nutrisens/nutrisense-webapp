import { IngredientCatalogItem } from '../domain/model/ingredient-catalog-item.entity.js'

export class IngredientCatalogItemAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof IngredientCatalogItem>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return IngredientCatalogItem({
        id: resource.id,
        key: resource.key,
        foodId: resource.foodId ?? null,
        category: resource.category,
        defaultUnit: resource.defaultUnit,
        gramsPerUnit: resource.gramsPerUnit,
      })
    } catch (e) {
      console.error('[IngredientCatalogItemAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof IngredientCatalogItem>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => IngredientCatalogItemAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
