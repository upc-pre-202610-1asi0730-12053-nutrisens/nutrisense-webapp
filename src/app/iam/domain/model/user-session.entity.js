/**
 * @typedef {Object} UserSessionProps
 * @property {string} id
 * @property {string} userId
 * @property {string} deviceLabel
 * @property {boolean} isCurrent
 * @property {string} createdAt
 * @property {string} lastActiveAt
 */

/** @param {UserSessionProps} props */
export function UserSession(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    deviceLabel: props.deviceLabel,
    isCurrent: props.isCurrent,
    createdAt: props.createdAt,
    lastActiveAt: props.lastActiveAt,

    /** @returns {boolean} */
    isCurrentSession() { return props.isCurrent },
    /**
     * @param {number} [maxInactiveMinutes=60]
     * @returns {boolean}
     */
    isExpired(maxInactiveMinutes = 60) {
      const elapsedMs = Date.now() - new Date(props.lastActiveAt).getTime()
      return elapsedMs > maxInactiveMinutes * 60_000
    },
    /** @returns {number} */
    minutesSinceLastActivity() {
      return Math.floor((Date.now() - new Date(props.lastActiveAt).getTime()) / 60_000)
    },
  })
}
