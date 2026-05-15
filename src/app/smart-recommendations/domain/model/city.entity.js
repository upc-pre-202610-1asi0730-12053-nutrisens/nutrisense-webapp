import { WeatherType } from './weather-type.record.js'
import { WeatherCondition } from './weather-condition.record.js'

/**
 * @typedef {Object} CityProps
 * @property {string} id
 * @property {string} key
 * @property {string} country
 * @property {number} lat
 * @property {number} lng
 * @property {string} timezone
 * @property {number} currentTempC
 * @property {import('./weather-condition.record.js').WeatherConditionValue} weatherCondition
 * @property {import('./weather-type.record.js').WeatherTypeValue} weatherType
 * @property {string} weatherUpdatedAt
 */

/** @param {CityProps} props */
export function City(props) {
  const weatherType = WeatherType(props.weatherType)
  const weatherCondition = WeatherCondition(props.weatherCondition)

  return Object.freeze({
    id: props.id,
    key: props.key,
    country: props.country,
    lat: props.lat,
    lng: props.lng,
    timezone: props.timezone,
    currentTempC: props.currentTempC,
    weatherType,
    weatherCondition,
    weatherUpdatedAt: props.weatherUpdatedAt,

    /** @returns {boolean} */
    isHot() { return weatherType.isHot() },
    /** @returns {boolean} */
    isCold() { return weatherType.isCold() },
    /**
     * @param {number} [thresholdMinutes=30]
     * @returns {boolean}
     */
    weatherIsStale(thresholdMinutes = 30) {
      const elapsedMin = (Date.now() - new Date(props.weatherUpdatedAt).getTime()) / 60_000
      return elapsedMin > thresholdMinutes
    },
  })
}
