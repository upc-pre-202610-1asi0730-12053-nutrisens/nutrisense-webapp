import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class BodyHealthMetricsApi extends BaseApi {
  #bodyMeasurements
  #weightLogs
  #userGoals

  constructor() {
    super()
    this.#bodyMeasurements = new BaseEndpoint(this, import.meta.env.VITE_BODY_MEASUREMENTS_ENDPOINT)
    this.#weightLogs = new BaseEndpoint(this, import.meta.env.VITE_WEIGHT_LOGS_ENDPOINT)
    this.#userGoals = new BaseEndpoint(this, import.meta.env.VITE_USER_GOALS_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getBodyMeasurements() {
    return this.#bodyMeasurements.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getBodyMeasurement(id) {
    return this.#bodyMeasurements.getById(id)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createBodyMeasurement(resource) {
    return this.#bodyMeasurements.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateBodyMeasurement(id, resource) {
    return this.#bodyMeasurements.update(id, resource)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getWeightLogs() {
    return this.#weightLogs.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createWeightLog(resource) {
    return this.#weightLogs.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateWeightLog(id, resource) {
    return this.#weightLogs.update(id, resource)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getUserGoals() {
    return this.#userGoals.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createUserGoal(resource) {
    return this.#userGoals.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateUserGoal(id, resource) {
    return this.#userGoals.update(id, resource)
  }
}
