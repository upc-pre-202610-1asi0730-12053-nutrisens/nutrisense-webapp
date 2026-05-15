import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class ActivityWearableApi extends BaseApi {
  #activityLogs
  #wearableConnections

  constructor() {
    super()
    this.#activityLogs = new BaseEndpoint(this, import.meta.env.VITE_ACTIVITY_LOGS_ENDPOINT)
    this.#wearableConnections = new BaseEndpoint(this, import.meta.env.VITE_WEARABLE_CONNECTIONS_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getLogs() {
    return this.#activityLogs.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createLog(resource) {
    return this.#activityLogs.create(resource)
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteLog(id) {
    return this.#activityLogs.delete(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getConnections() {
    return this.#wearableConnections.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createConnection(resource) {
    return this.#wearableConnections.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateConnection(id, resource) {
    return this.#wearableConnections.update(id, resource)
  }
}
