import { StreakRecord } from '../domain/model/streak-record.entity.js'
import { toLocalDateString } from '../../shared/infrastructure/date-utils.js'

/**
 * Maps a set of complete dates (YYYY-MM-DD) onto the current local Mon–Sun
 * calendar week, returning a 7-boolean array. Keeps the dots in the user's
 * local timezone regardless of how the server bucketed the dates.
 * @param {string[]} completedDates
 * @returns {boolean[]}
 */
function buildWeeklyCompletionDays(completedDates) {
  const done = new Set(completedDates)
  const now = new Date()
  const [ty, tm, td] = toLocalDateString(now).split('-').map(Number)
  const todayDow = (now.getDay() + 6) % 7 // 0 = Monday
  return Array.from({ length: 7 }, (_, i) =>
    done.has(toLocalDateString(new Date(ty, tm - 1, td - todayDow + i)))
  )
}

export class StreakRecordAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof StreakRecord>|null}
   */
  static toEntityFromResource(resource) {
    try {
      const completedDates = Array.isArray(resource.completedDates) ? resource.completedDates : []

      return StreakRecord({
        currentStreak: resource.currentStreak ?? 0,
        longestStreak: resource.longestStreak ?? 0,
        lastLogDate: resource.lastLogDate ?? null,
        weeklyCompletionRate: resource.weeklyCompletionRate ?? 0,
        weeklyCompletionDays: buildWeeklyCompletionDays(completedDates),
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
