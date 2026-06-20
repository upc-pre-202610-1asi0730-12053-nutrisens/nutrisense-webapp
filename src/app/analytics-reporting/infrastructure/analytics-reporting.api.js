import { BaseApi } from '../../shared/infrastructure/base-api.js'

export class AnalyticsReportingApi extends BaseApi {
  /**
   * @param {number|string} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getStreak(userId) {
    return this.http.get(`/analytics/streaks/by-user/${userId}`)
  }

  /**
   * @param {number|string} userId
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getDashboard(userId, date) {
    return this.http.get(`/analytics/dashboard/by-user/${userId}`, { params: { date } })
  }

  /**
   * @param {number|string} userId
   * @param {string} from - YYYY-MM-DD
   * @param {string} to - YYYY-MM-DD
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getProgress(userId, from, to) {
    return this.http.get(`/analytics/progress/by-user/${userId}`, { params: { from, to } })
  }
}
