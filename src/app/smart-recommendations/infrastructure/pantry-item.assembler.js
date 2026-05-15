import { PantryItem } from '../domain/model/pantry-item.entity.js'

export class PantryItemAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof PantryItem>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return PantryItem({
        id: resource.id,
        userId: resource.userId,
        ingredientId: resource.ingredientId,
        quantity: resource.quantity,
        unit: resource.unit,
        addedAt: resource.addedAt,
      })
    } catch (e) {
      console.error('[PantryItemAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof PantryItem>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => PantryItemAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
