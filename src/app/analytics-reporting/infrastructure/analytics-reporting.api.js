import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class AnalyticsReportingApi extends BaseApi {
  #streaks

  constructor() {
    super()
    this.#streaks = new BaseEndpoint(this, import.meta.env.VITE_STREAK_ENDPOINT)
  }

  /**
   * @param {string} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getStreak(userId) {
    return this.#streaks.getWhere({ userId })
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createStreak(resource) {
    return this.#streaks.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateStreak(id, resource) {
    return this.#streaks.update(id, resource)
  }
}
