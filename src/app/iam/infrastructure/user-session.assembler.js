import { UserSession } from '../domain/model/user-session.entity.js'

export class UserSessionAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof UserSession>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return UserSession({
        id: resource.id,
        userId: resource.userId,
        deviceLabel: resource.deviceLabel,
        isCurrent: resource.isCurrent,
        createdAt: resource.createdAt,
        lastActiveAt: resource.lastActiveAt,
      })
    } catch (e) {
      console.error('[UserSessionAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof UserSession>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => UserSessionAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
