import { WeightLog } from '../domain/model/weight-log.entity.js'

export class WeightLogAssembler {
  /**
   * Maps a raw resource object (with id and userId) to a WeightLog entity.
   * Used when the backend returns a full weight log record.
   * @param {Object} resource
   * @returns {ReturnType<typeof WeightLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return WeightLog({
        id: resource.id ?? resource.loggedAt,
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
   * Maps a weight-history entry (no id, no userId) to a WeightLog entity.
   * Uses loggedAt as a synthetic id.
   * @param {{ weightKg: number, loggedAt: string, note: string|null }} entry
   * @param {number|string} userId
   * @returns {ReturnType<typeof WeightLog>|null}
   */
  static toEntityFromHistoryEntry(entry, userId) {
    try {
      return WeightLog({
        id: entry.loggedAt,
        userId,
        weightKg: entry.weightKg,
        loggedAt: entry.loggedAt,
        note: entry.note ?? null,
      })
    } catch (e) {
      console.error('[WeightLogAssembler] failed to map history entry', e)
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

  /**
   * Maps the GET /weight-history response to WeightLog entities.
   * @param {import('axios').AxiosResponse} response
   * @param {number|string} userId
   * @returns {ReturnType<typeof WeightLog>[]}
   */
  static toEntitiesFromHistoryResponse(response, userId) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(e => WeightLogAssembler.toEntityFromHistoryEntry(e, userId)).filter(Boolean)
  }
}
