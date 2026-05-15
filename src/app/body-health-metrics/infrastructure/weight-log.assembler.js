import { WeightLog } from '../domain/model/weight-log.entity.js'

export class WeightLogAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof WeightLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return WeightLog({
        id: resource.id,
        userId: resource.userId,
        weightKg: resource.weightKg,
        loggedAt: resource.loggedAt,
        note: resource.note ?? null,
      })
    } catch (e) {
      console.error('[WeightLogAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof WeightLog>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => WeightLogAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
