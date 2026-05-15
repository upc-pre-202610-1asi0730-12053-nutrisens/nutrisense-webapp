/** @typedef {'male' | 'female' | 'prefer-not-to-say'} BiologicalSexValue */

export const MALE = 'male'
export const FEMALE = 'female'
export const PREFER_NOT_TO_SAY = 'prefer-not-to-say'

const VALID = new Set([MALE, FEMALE, PREFER_NOT_TO_SAY])

/** @param {BiologicalSexValue} value */
export function BiologicalSex(value) {
  if (!VALID.has(value)) throw new Error(`Invalid biological sex: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isMale() { return value === MALE },
    /** @returns {boolean} */
    isFemale() { return value === FEMALE },
    /** @returns {boolean} */
    isDisclosed() { return value !== PREFER_NOT_TO_SAY },
  })
}
