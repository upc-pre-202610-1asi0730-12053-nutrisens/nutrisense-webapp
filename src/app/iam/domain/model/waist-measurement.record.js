// PATH: src/app/iam/domain/model/waist-measurement.record.js

/** @type {Record<number, number>} */
const PANTS_TO_CM = { 26: 66, 28: 71, 30: 76, 32: 81, 34: 86, 36: 91 }

/** @type {Record<string, number>} */
const VISUAL_TO_CM = { slim: 70, normal: 82, wide: 92 }

/** @type {number} */
const PANTS_FALLBACK_CM = 81

/** @type {number} */
const VISUAL_FALLBACK_CM = 82

/**
 * Resolves a waist circumference in centimetres from whichever measurement
 * method the user chose during onboarding.
 *
 * @param {'exact'|'pants'|'visual'} method
 * @param {number|string} value - exact cm, pants size (number), or visual key (string)
 * @returns {number} waist in cm
 */
export function WaistMeasurement(method, value) {
  if (method === 'exact') {
    const cm = Number(value)
    if (!isFinite(cm) || cm <= 0) throw new RangeError(`Invalid waist cm: ${value}`)
    return cm
  }
  if (method === 'pants') {
    return PANTS_TO_CM[Number(value)] ?? PANTS_FALLBACK_CM
  }
  if (method === 'visual') {
    return VISUAL_TO_CM[String(value)] ?? VISUAL_FALLBACK_CM
  }
  throw new TypeError(`Unknown waist method: ${method}`)
}

/** Exposes the pants-size lookup table (read-only) for building UI options. */
WaistMeasurement.pantsSizes = Object.freeze(Object.keys(PANTS_TO_CM).map(Number))

/** Exposes the visual option keys (read-only) for building UI options. */
WaistMeasurement.visualKeys = Object.freeze(Object.keys(VISUAL_TO_CM))
