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

  /**
   * @param {number} userId
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getLogsByUserAndDate(userId, date) {
    return this.http.get(
      `${import.meta.env.VITE_NUTRITION_LOGS_ENDPOINT}/by-user/${userId}`,
      { params: { date } },
    )
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

  /**
   * @param {string} query
   * @param {string} [language]
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  searchFoods(query, language = 'en') {
    return this.#foods.getWhere({ query, language })
  }

  /**
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getFoodById(id) {
    return this.#foods.getById(id)
  }

  /**
   * Smart Scan — analyze a dish photo. Returns detected items with macros (does not persist a log).
   * @param {number} userId
   * @param {string} imageBase64OrUri - base64 (with or without data-URL prefix)
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  scanDish(userId, imageBase64OrUri) {
    return this.http.post(
      `${import.meta.env.VITE_NUTRITION_LOGS_ENDPOINT}/scan-dish`,
      { userId: Number(userId), imageBase64OrUri },
    )
  }

  /**
   * Smart Scan — analyze a menu photo. Returns the available options with macros (does not persist a log).
   * @param {number} userId
   * @param {string} imageBase64OrUri - base64 (with or without data-URL prefix)
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  scanMenu(userId, imageBase64OrUri) {
    return this.http.post(
      `${import.meta.env.VITE_NUTRITION_LOGS_ENDPOINT}/scan-menu`,
      { userId: Number(userId), imageBase64OrUri },
    )
  }
}
