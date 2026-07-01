import { WearableProvider } from './wearable-provider.record.js'
import { WearableStatus } from './wearable-status.record.js'

/**
 * @typedef {Object} WearableConnectionProps
 * @property {string} id
 * @property {string} userId
 * @property {import('./wearable-provider.record.js').WearableProviderValue} provider
 * @property {import('./wearable-status.record.js').WearableStatusValue} status
 * @property {string|null} lastSyncedAt
 * @property {string} authorizedAt
 * @property {boolean} [autoSyncEnabled]
 */

/** @param {WearableConnectionProps} props */
export function WearableConnection(props) {
  const provider = WearableProvider(props.provider)
  const status = WearableStatus(props.status)

  return Object.freeze({
    id: props.id,
    userId: props.userId,
    provider,
    status,
    lastSyncedAt: props.lastSyncedAt,
    authorizedAt: props.authorizedAt,
    autoSyncEnabled: props.autoSyncEnabled ?? false,

    /** @returns {boolean} */
    isConnected() { return status.isConnected() },
    /**
     * @param {number} [thresholdMinutes=15]
     * @returns {boolean}
     */
    needsSync(thresholdMinutes = 15) {
      if (!props.lastSyncedAt) return true
      const elapsedMin = (Date.now() - new Date(props.lastSyncedAt).getTime()) / 60_000
      return elapsedMin > thresholdMinutes
    },
    /** @returns {number|null} null if never synced */
    minutesSinceLastSync() {
      if (!props.lastSyncedAt) return null
      return Math.floor((Date.now() - new Date(props.lastSyncedAt).getTime()) / 60_000)
    },
  })
}
