import { WearableConnection } from '../domain/model/wearable-connection.entity.js'

// Backend WearableStatus values differ from the frontend domain model.
const STATUS_MAP = {
  'authorized':   'connected',
  'needs-reauth': 'error',
}

export class WearableConnectionAssembler {
  /**
   * Builds the API request body for ConnectDeviceResource.
   * @param {string} userId
   * @param {string} provider
   * @param {string} oauthCode
   * @returns {Object}
   */
  static toResource(userId, provider, oauthCode) {
    return {
      userId:    Number(userId),
      provider,
      oauthCode,
    }
  }

  /**
   * @param {Object} resource - camelCase response from backend (WearableConnectionResource)
   * @returns {ReturnType<typeof WearableConnection>|null}
   */
  static toEntityFromResource(resource) {
    try {
      const status = STATUS_MAP[resource.status] ?? 'disconnected'
      return WearableConnection({
        id:           String(resource.id),
        userId:       String(resource.userId),
        provider:     resource.provider,
        status,
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
