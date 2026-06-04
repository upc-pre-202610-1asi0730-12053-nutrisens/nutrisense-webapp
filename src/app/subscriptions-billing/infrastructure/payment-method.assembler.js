// PATH: src/app/subscriptions-billing/infrastructure/payment-method.assembler.js
import { PaymentMethod } from '../domain/model/payment-method.entity.js'

/**
 * @typedef {{ cardNumber: string, expiryMonth: number, expiryYear: number, cardholderName: string }} CardInput
 */

export class PaymentMethodAssembler {
  /**
   * Builds the API resource body from raw card input.
   * @param {string} userId
   * @param {CardInput} cardData
   * @returns {Object}
   */
  static toResource(userId, cardData) {
    return {
      userId,
      lastFour:       cardData.cardNumber.replace(/\D/g, '').slice(-4),
      brand:          PaymentMethod.detectBrand(cardData.cardNumber),
      expiryMonth:    cardData.expiryMonth,
      expiryYear:     cardData.expiryYear,
      cardholderName: cardData.cardholderName.trim(),
      createdAt:      new Date().toISOString(),
    }
  }

  /**
   * @param {Object} resource
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
        createdAt:      resource.createdAt,
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
