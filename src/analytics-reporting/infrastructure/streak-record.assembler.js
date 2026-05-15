import { StreakRecord } from '../domain/model/streak-record.entity.js'

export class StreakRecordAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof StreakRecord>|null}
   */
  static toEntityFromResource(resource) {
    try {
      const weeklyCompletionRate =
        resource.weeklyCompletionRate !== undefined
          ? resource.weeklyCompletionRate
          : (resource.weeklyCompletionDays ?? 0) / 7

      return StreakRecord({
        currentStreak: resource.currentStreak ?? 0,
        longestStreak: resource.longestStreak ?? 0,
        lastLogDate: resource.lastLogDate ?? null,
        weeklyCompletionRate,
        weeklyCompletionDays: resource.weeklyCompletionDays ?? Array(7).fill(false),
      })
    } catch (e) {
      console.error('[StreakRecordAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof StreakRecord>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => StreakRecordAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof StreakRecord>|null}
   */
  static toEntityFromResponse(response) {
    return StreakRecordAssembler.toEntityFromResource(response.data)
  }
}
