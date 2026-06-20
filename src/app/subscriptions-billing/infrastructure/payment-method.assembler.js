import { PaymentMethod } from '../domain/model/payment-method.entity.js'

/**
 * @typedef {import('../../shared/infrastructure/use-stripe-card.js').CardMeta} CardMeta
 */

export class PaymentMethodAssembler {
  /**
   * Builds the RegisterPaymentMethodResource body for the backend.
   * All card metadata comes from the Stripe PaymentMethod object — never
   * from raw card-number input.
   * @param {number|string} userId
   * @param {string} stripePaymentMethodId  - e.g. "pm_xxx"
   * @param {CardMeta} cardMeta             - from Stripe's paymentMethod.card
   * @returns {Object}
   */
  static toResource(userId, stripePaymentMethodId, cardMeta) {
    return {
      userId:                parseInt(userId, 10),
      lastFour:              cardMeta.lastFour,
      brand:                 cardMeta.brand,
      expiryMonth:           cardMeta.expiryMonth,
      expiryYear:            cardMeta.expiryYear,
      cardholderName:        cardMeta.cardholderName,
      stripePaymentMethodId,
    }
  }

  /**
   * @param {Object} resource - camelCased backend PaymentMethodResource
   * @returns {ReturnType<typeof PaymentMethod>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return PaymentMethod({
        id:             resource.id,
        userId:         resource.userId,
        lastFour:       resource.lastFour,
        brand:          resource.brand,
        expiryMonth:    resource.expiryMonth,
        expiryYear:     resource.expiryYear,
        cardholderName: resource.cardholderName,
        createdAt:      resource.createdAt ?? null,
      })
    } catch (e) {
      console.error('[PaymentMethodAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof PaymentMethod>|null}
   */
  static toEntityFromResponse(response) {
    return PaymentMethodAssembler.toEntityFromResource(response.data)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof PaymentMethod>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => PaymentMethodAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
