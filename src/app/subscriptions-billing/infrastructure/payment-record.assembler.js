import { PaymentRecord } from '../domain/model/payment-record.entity.js'

export class PaymentRecordAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof PaymentRecord>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return PaymentRecord({
        id: resource.id,
        userId: resource.userId,
        planId: resource.planId,
        amountUsd: resource.amountUsd,
        status: resource.status,
        paidAt: resource.paidAt ?? null,
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
