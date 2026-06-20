import { Weather } from '../domain/model/weather.record.js'

export class WeatherAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof Weather>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return Weather({
        cityId: resource.cityId,
        tempC: resource.tempC,
        condition: resource.condition,
        weatherType: resource.weatherType,
        at: resource.at,
      })
    } catch (e) {
      console.error('[WeatherAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof Weather>|null}
   */
  static toEntityFromResponse(response) {
    return response.data ? WeatherAssembler.toEntityFromResource(response.data) : null
  }
}
