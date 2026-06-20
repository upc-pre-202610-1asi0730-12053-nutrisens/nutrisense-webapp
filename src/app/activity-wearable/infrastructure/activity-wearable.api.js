import { BaseApi } from '../../shared/infrastructure/base-api.js'

export class ActivityWearableApi extends BaseApi {
  /**
   * @param {number} userId
   * @param {string} [from] - yyyy-MM-dd
   * @param {string} [to] - yyyy-MM-dd
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getLogsByUser(userId, from, to) {
    const params = {}
    if (from) params.from = from
    if (to)   params.to   = to
    return this.http.get(`/activity-logs/by-user/${userId}`, { params })
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createLog(resource) {
    return this.http.post('/activity-logs', resource)
  }

  /**
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteLog(id, userId) {
    return this.http.delete(`/activity-logs/${id}`, { params: { userId } })
  }

  /**
   * @param {number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getConnectionsByUser(userId) {
    return this.http.get(`/wearable-connections/by-user/${userId}`)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createConnection(resource) {
    return this.http.post('/wearable-connections', resource)
  }

  /**
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteConnection(id) {
    return this.http.delete(`/wearable-connections/${id}`)
  }
}
