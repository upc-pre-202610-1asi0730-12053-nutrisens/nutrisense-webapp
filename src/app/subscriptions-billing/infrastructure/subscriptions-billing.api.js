import { BaseApi } from '../../shared/infrastructure/base-api.js'

export class SubscriptionsBillingApi extends BaseApi {
  /** @param {number} userId */
  getSubscriptionByUser(userId) {
    return this.http.get(`user-subscriptions/by-user/${userId}`)
  }

  /**
   * @param {{ userId: number, planKey: string, paymentMethodId: number, billingPeriod: string }} resource
   */
  selectPlan(resource) {
    return this.http.post('user-subscriptions', resource)
  }

  /**
   * @param {number} subscriptionId
   * @param {{ newPlanKey: string, billingPeriod: string, paymentMethodId?: number }} resource
   */
  changePlan(subscriptionId, resource) {
    return this.http.put(`user-subscriptions/${subscriptionId}/plan`, resource)
  }

  /**
   * @param {number} subscriptionId
   * @param {{ cancelAtPeriodEnd: boolean }} resource
   */
  cancelSubscription(subscriptionId, resource) {
    return this.http.post(`user-subscriptions/${subscriptionId}/cancel`, resource)
  }

  /** @param {number} subscriptionId */
  renewSubscription(subscriptionId) {
    return this.http.post(`user-subscriptions/${subscriptionId}/renew`)
  }

  getPlans() {
    return this.http.get('subscription-plans')
  }

  /** @param {string} key */
  getPlanByKey(key) {
    return this.http.get(`subscription-plans/${key}`)
  }

  /** @param {number} subscriptionId */
  getPaymentHistory(subscriptionId) {
    return this.http.get(`payments/by-subscription/${subscriptionId}`)
  }

  /** @param {number} userId */
  getPaymentMethods(userId) {
    return this.http.get(`payment-methods/by-user/${userId}`)
  }

  /** @param {Object} resource */
  createPaymentMethod(resource) {
    return this.http.post('payment-methods', resource)
  }

  /** @param {number} id */
  deletePaymentMethod(id) {
    return this.http.delete(`payment-methods/${id}`)
  }
}
