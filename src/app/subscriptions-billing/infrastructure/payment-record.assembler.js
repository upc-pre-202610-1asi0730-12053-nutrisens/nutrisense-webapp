import { PaymentRecord } from '../domain/model/payment-record.entity.js'

export class PaymentRecordAssembler {
  /**
   * @param {Object} resource - camelCased backend PaymentRecordResource
   * @returns {ReturnType<typeof PaymentRecord>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return PaymentRecord({
        id: resource.id,
        userSubscriptionId: resource.userSubscriptionId,
        amount: resource.amount,
        currency: resource.currency ?? 'USD',
        status: resource.status,
        processedAt: resource.processedAt ?? null,
        stripePaymentIntentId: resource.stripePaymentIntentId ?? null,
      })
    } catch (e) {
      console.error('[PaymentRecordAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof PaymentRecord>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => PaymentRecordAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
