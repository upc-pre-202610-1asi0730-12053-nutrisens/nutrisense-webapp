import { WearableConnection } from '../domain/model/wearable-connection.entity.js'

export class WearableConnectionAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof WearableConnection>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return WearableConnection({
        id: resource.id,
        userId: resource.userId,
        provider: resource.provider,
        status: resource.status,
        lastSyncedAt: resource.lastSyncedAt ?? null,
        authorizedAt: resource.authorizedAt,
      })
    } catch (e) {
      console.error('[WearableConnectionAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof WearableConnection>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => WearableConnectionAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
