// PATH: src/app/iam/domain/model/height.record.js

/**
 * Value Object representing a validated height in centimetres.
 * Throws if the value is outside the physiologically plausible range.
 * @param {number} cm
 * @returns {Readonly<{ cm: number }>}
 */
export function Height(cm) {
  if (typeof cm !== 'number' || cm < 100 || cm > 250) {
    throw new RangeError(`Height must be between 100 and 250 cm, got ${cm}`)
  }
  return Object.freeze({ cm })
}

/**
 * Returns true when the value is a valid height in cm.
 * @param {number} cm
 * @returns {boolean}
 */
Height.isValid = function isValid(cm) {
  return typeof cm === 'number' && cm >= 100 && cm <= 250
}
