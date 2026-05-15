import { BodyMeasurement } from '../domain/model/body-measurement.entity.js'

export class BodyMeasurementAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof BodyMeasurement>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return BodyMeasurement({
        id: resource.id,
        userId: resource.userId,
        waistCm: resource.waistCm,
        neckCm: resource.neckCm,
        measuredAt: resource.measuredAt,
      })
    } catch (e) {
      console.error('[BodyMeasurementAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof BodyMeasurement>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => BodyMeasurementAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof BodyMeasurement>|null}
   */
  static toEntityFromResponse(response) {
    return BodyMeasurementAssembler.toEntityFromResource(response.data)
  }
}
