/** @typedef {'google-health' | 'google-fit' | 'apple-health' | 'fitbit'} WearableProviderValue */

export const GOOGLE_HEALTH = 'google-health'
export const GOOGLE_FIT = 'google-fit'
export const APPLE_HEALTH = 'apple-health'
export const FITBIT = 'fitbit'

const VALID = new Set([GOOGLE_HEALTH, GOOGLE_FIT, APPLE_HEALTH, FITBIT])

/** @param {WearableProviderValue} value */
export function WearableProvider(value) {
  if (!VALID.has(value)) throw new Error(`Invalid wearable provider: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isGoogleHealth() { return value === GOOGLE_HEALTH },
    /** @returns {boolean} */
    isGoogleFit() { return value === GOOGLE_FIT },
    /** @returns {boolean} */
    isAppleHealth() { return value === APPLE_HEALTH },
  })
}
