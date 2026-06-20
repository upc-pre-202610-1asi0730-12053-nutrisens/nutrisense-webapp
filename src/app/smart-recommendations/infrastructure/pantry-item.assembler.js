import { PantryItem } from '../domain/model/pantry-item.entity.js'

export class PantryItemAssembler {
  /**
   * @param {Object} resource - PantryItemResource
   * @param {string|number} userId - from parent PantryResource
   * @returns {ReturnType<typeof PantryItem>|null}
   */
  static toEntityFromResource(resource, userId) {
    try {
      return PantryItem({
        id: resource.id,
        userId,
        ingredientId: resource.ingredientCatalogItemId,
        quantity: resource.quantity,
        unit: resource.unit,
        addedAt: null,
      })
    } catch (e) {
      console.error('[PantryItemAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * Maps a PantryResource (wrapped) response to PantryItem entities.
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof PantryItem>[]}
   */
  static toEntitiesFromResponse(response) {
    const pantryResource = response.data ?? {}
    const userId = pantryResource.userId
    const items = Array.isArray(pantryResource.items) ? pantryResource.items : []
    return items.map(r => PantryItemAssembler.toEntityFromResource(r, userId)).filter(Boolean)
  }
}
