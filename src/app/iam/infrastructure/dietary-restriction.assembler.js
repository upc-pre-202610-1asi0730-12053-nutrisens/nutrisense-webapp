import { DietaryRestriction } from '../domain/model/dietary-restriction.entity.js'

export class DietaryRestrictionAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof DietaryRestriction>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return DietaryRestriction({
        id: resource.id,
        userId: resource.userId,
        restriction: resource.restriction,
      })
    } catch (e) {
      console.error('[DietaryRestrictionAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof DietaryRestriction>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => DietaryRestrictionAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
