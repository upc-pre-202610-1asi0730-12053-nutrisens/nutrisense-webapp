// PATH: src/app/iam/domain/model/date-of-birth.record.js

const MIN_AGE_YEARS = 13

/**
 * Value Object representing a validated date of birth.
 * Throws if the date is in the future or the person is younger than 13.
 * @param {string} isoString - YYYY-MM-DD or full ISO string
 * @returns {Readonly<{ isoString: string, age: () => number }>}
 */
export function DateOfBirth(isoString) {
  if (!isoString) throw new TypeError('Date of birth is required')

  const parsed = new Date(isoString)
  if (isNaN(parsed.getTime())) throw new TypeError(`Invalid date: ${isoString}`)

  const today = new Date()
  if (parsed > today) throw new RangeError('Date of birth cannot be in the future')

  const ageYears = _calculateAge(parsed, today)
  if (ageYears < MIN_AGE_YEARS) {
    throw new RangeError(`User must be at least ${MIN_AGE_YEARS} years old`)
  }

  return Object.freeze({
    isoString,
    /** Returns full years of age as of today. */
    age() { return _calculateAge(new Date(this.isoString), new Date()) },
  })
}

/**
 * Returns a human-readable error string or null when the value is valid.
 * @param {string} value
 * @returns {string|null}
 */
DateOfBirth.validate = function validate(value) {
  if (!value) return 'required'
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return 'invalid'
  if (parsed > new Date()) return 'future'
  if (_calculateAge(parsed, new Date()) < MIN_AGE_YEARS) return 'tooYoung'
  return null
}

/** @param {Date} dob @param {Date} ref @returns {number} */
function _calculateAge(dob, ref) {
  let age = ref.getFullYear() - dob.getFullYear()
  const m = ref.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--
  return age
}
