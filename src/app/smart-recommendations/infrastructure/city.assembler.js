import { City } from '../domain/model/city.entity.js'

export class CityAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof City>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return City({
        id: resource.id,
        key: resource.key,
        country: resource.country,
        lat: resource.lat,
        lng: resource.lng,
        timezone: resource.timezone,
        currentTempC: resource.currentTempC,
        weatherCondition: resource.weatherCondition,
        weatherType: resource.weatherType,
        weatherUpdatedAt: resource.weatherUpdatedAt,
      })
    } catch (e) {
      console.error('[CityAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof City>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => CityAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof City>|null}
   */
  static toEntityFromResponse(response) {
    return CityAssembler.toEntityFromResource(response.data)
  }
}
