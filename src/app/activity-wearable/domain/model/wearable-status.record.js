/** @typedef {'connected' | 'disconnected' | 'error'} WearableStatusValue */

export const CONNECTED = 'connected'
export const DISCONNECTED = 'disconnected'
export const ERROR = 'error'

const VALID = new Set([CONNECTED, DISCONNECTED, ERROR])

/** @param {WearableStatusValue} value */
export function WearableStatus(value) {
  if (!VALID.has(value)) throw new Error(`Invalid wearable status: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isConnected() { return value === CONNECTED },
    /** @returns {boolean} */
    hasError() { return value === ERROR },
    /** @returns {boolean} connected and no error */
    isUsable() { return value === CONNECTED },
  })
}
