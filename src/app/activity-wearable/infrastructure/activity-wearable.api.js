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
   * Manually triggers an activity-data sync for a wearable connection.
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  syncConnection(id) {
    return this.http.post(`/wearable-connections/${id}/sync`)
  }

  /**
   * Enables or disables automatic syncing for a wearable connection.
   * @param {number} id
   * @param {boolean} enabled
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  setAutoSync(id, enabled) {
    return this.http.patch(`/wearable-connections/${id}/auto-sync`, { enabled })
  }

  /**
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteConnection(id) {
    return this.http.delete(`/wearable-connections/${id}`)
  }
}
