import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class NutritionTrackingApi extends BaseApi {
  #nutritionLogs
  #foods

  constructor() {
    super()
    this.#nutritionLogs = new BaseEndpoint(this, import.meta.env.VITE_NUTRITION_LOGS_ENDPOINT)
    this.#foods = new BaseEndpoint(this, import.meta.env.VITE_FOODS_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getLogs() {
    return this.#nutritionLogs.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getLogById(id) {
    return this.#nutritionLogs.getById(id)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createLog(resource) {
    return this.#nutritionLogs.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateLog(id, resource) {
    return this.#nutritionLogs.patch(id, resource)
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteLog(id) {
    return this.#nutritionLogs.delete(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getFoods() {
    return this.#foods.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getFoodById(id) {
    return this.#foods.getById(id)
  }
}
