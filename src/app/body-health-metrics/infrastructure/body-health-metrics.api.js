import { BaseApi } from '../../shared/infrastructure/base-api.js'

export class BodyHealthMetricsApi extends BaseApi {
  #base

  constructor() {
    super()
    this.#base = import.meta.env.VITE_BODY_MEASUREMENTS_ENDPOINT
  }

  /** @param {number} userId */
  getBodyMetrics(userId) {
    return this.http.get(`${this.#base}/by-user/${userId}`)
  }

  /** @param {Object} resource - { userId, heightCm, weightKg, dateOfBirth, biologicalSex, activityLevel } */
  registerBodyMetrics(resource) {
    return this.http.post(this.#base, resource)
  }

  /**
   * @param {number} userId
   * @param {{ waistCm: number, neckCm: number }} resource
   */
  registerBodyMeasurement(userId, resource) {
    return this.http.post(`${this.#base}/${userId}/body-measurements`, resource)
  }

  /**
   * @param {number} userId
   * @param {{ weightKg: number, note: string|null }} resource
   */
  updateWeight(userId, resource) {
    return this.http.put(`${this.#base}/${userId}/weight`, resource)
  }

  /** @param {number} userId */
  getWeightHistory(userId) {
    return this.http.get(`${this.#base}/${userId}/weight-history`)
  }

  /**
   * @param {number} userId
   * @param {{ goal: string, targetWeightKg: number, weeklyRateKg: number }} resource
   */
  setHealthGoal(userId, resource) {
    return this.http.put(`${this.#base}/${userId}/health-goal`, resource)
  }
}
