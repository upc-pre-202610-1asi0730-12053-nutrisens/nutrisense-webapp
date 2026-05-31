import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class SubscriptionsBillingApi extends BaseApi {
  #userSubscriptions
  #subscriptionPlans
  #paymentHistory
  #paymentMethods

  constructor() {
    super()
    this.#userSubscriptions = new BaseEndpoint(this, import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT)
    this.#subscriptionPlans = new BaseEndpoint(this, import.meta.env.VITE_SUBSCRIPTION_PLANS_ENDPOINT)
    this.#paymentHistory    = new BaseEndpoint(this, import.meta.env.VITE_PAYMENT_HISTORY_ENDPOINT)
    this.#paymentMethods    = new BaseEndpoint(this, import.meta.env.VITE_PAYMENT_METHODS_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getSubscriptions() {
    return this.#userSubscriptions.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createSubscription(resource) {
    return this.#userSubscriptions.create(resource)
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateSubscription(id, resource) {
    return this.#userSubscriptions.patch(id, resource)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getPlans() {
    return this.#subscriptionPlans.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getPlanById(id) {
    return this.#subscriptionPlans.getById(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getPaymentHistory() {
    return this.#paymentHistory.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createPaymentRecord(resource) {
    return this.#paymentHistory.create(resource)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createPaymentMethod(resource) {
    return this.#paymentMethods.create(resource)
  }
}
