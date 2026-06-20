/**
 * @typedef {Object} WeatherProps
 * @property {number} cityId
 * @property {number} tempC
 * @property {import('./weather-condition.record.js').WeatherConditionValue} condition
 * @property {import('./weather-type.record.js').WeatherTypeValue} weatherType
 * @property {string} at - ISO timestamp of when the snapshot was taken
 */

/**
 * Current-weather snapshot for a city. Immutable value object.
 * @param {WeatherProps} props
 */
export function Weather(props) {
  return Object.freeze({
    cityId: props.cityId,
    tempC: props.tempC,
    condition: props.condition,
    weatherType: props.weatherType,
    at: props.at,

    /** Temperature rounded to a whole number for display. @returns {number} */
    roundedTemp() {
      return Math.round(props.tempC)
    },

    /**
     * PrimeIcons class that best represents the condition.
     * @returns {string}
     */
    icon() {
      switch (props.condition) {
        case 'sunny': return 'pi-sun'
        case 'rainy':
        case 'stormy': return 'pi-cloud'
        case 'snowy': return 'pi-cloud'
        default: return 'pi-cloud'
      }
    },
  })
}
