import { ActivityLog } from '../domain/model/activity-log.entity.js'
import { toLocalDateString } from '../../shared/infrastructure/date-utils.js'

export class ActivityLogAssembler {
  /**
   * Builds the API request body for LogManualActivityResource.
   * loggedAt is normalised to yyyy-MM-dd for the backend Date field.
   * @param {string} userId
   * @param {{ activityType: string, intensity: string, durationMinutes: number, caloriesBurned?: number, loggedAt?: Date|string }} activityData
   * @returns {Object}
   */
  static toResource(userId, activityData) {
    const loggedAtDate = activityData.loggedAt instanceof Date
      ? activityData.loggedAt
      : new Date(activityData.loggedAt ?? Date.now())
    return {
      userId:          Number(userId),
      date:            toLocalDateString(loggedAtDate),
      activityType:    activityData.activityType,
      durationMinutes: activityData.durationMinutes,
      intensity:       activityData.intensity,
      caloriesBurned:  activityData.caloriesBurned ?? 0,
    }
  }

  /**
   * @param {Object} resource - camelCase response from backend (ActivityLogResource)
   * @returns {ReturnType<typeof ActivityLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return ActivityLog({
        id:              String(resource.id),
        userId:          String(resource.userId),
        date:            resource.date,
        activityType:    resource.activityType,
        durationMinutes: resource.durationMinutes,
        intensity:       resource.intensity,
        caloriesBurned:  resource.caloriesBurned,
        source:          resource.source,
        loggedAt:        resource.loggedAt,
      })
    } catch (e) {
      console.error('[ActivityLogAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof ActivityLog>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => ActivityLogAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
