/**
 * @typedef {Object} BodyMeasurementProps
 * @property {string} id
 * @property {string} userId
 * @property {number} waistCm
 * @property {number} neckCm
 * @property {string} measuredAt - ISO datetime
 */

/** @param {BodyMeasurementProps} props */
export function BodyMeasurement(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    waistCm: props.waistCm,
    neckCm: props.neckCm,
    measuredAt: props.measuredAt,

    /** @returns {string} YYYY-MM-DD */
    dateLabel() { return props.measuredAt.slice(0, 10) },
    /**
     * US Navy body-fat approximation (male formula).
     * @param {number} heightCm
     * @returns {number} estimated body fat %
     */
    estimatedBodyFatPercent(heightCm) {
      return (
        86.01 * Math.log10(props.waistCm - props.neckCm) -
        70.041 * Math.log10(heightCm) +
        36.76
      )
    },
  })
}
