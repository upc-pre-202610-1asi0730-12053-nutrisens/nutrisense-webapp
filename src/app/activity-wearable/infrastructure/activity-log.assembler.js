import { ActivityLog } from '../domain/model/activity-log.entity.js'
import { toLocalDateString } from '../../shared/infrastructure/date-utils.js'

export class ActivityLogAssembler {
  /**
   * Builds the API request body for a manually logged activity.
   * Normalises the loggedAt field whether a Date object or ISO string is provided.
   * @param {string} userId
   * @param {{ activityType: string, intensity: string, durationMinutes: number, caloriesBurned?: number, loggedAt?: Date|string }} activityData
   * @returns {Object}
   */
  static toResource(userId, activityData) {
    const loggedAtDate = activityData.loggedAt instanceof Date
      ? activityData.loggedAt
      : new Date(activityData.loggedAt ?? Date.now())
    return {
      userId,
      activityType:    activityData.activityType,
      intensity:       activityData.intensity,
      durationMinutes: activityData.durationMinutes,
      caloriesBurned:  activityData.caloriesBurned ?? 0,
      source:          'manual',
      date:            toLocalDateString(loggedAtDate),
      loggedAt:        loggedAtDate.toISOString(),
    }
  }

  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof ActivityLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return ActivityLog({
        id: resource.id,
        userId: resource.userId,
        date: resource.date,
        activityType: resource.activityType,
        durationMinutes: resource.durationMinutes,
        intensity: resource.intensity,
        caloriesBurned: resource.caloriesBurned,
        source: resource.source,
        loggedAt: resource.loggedAt,
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
