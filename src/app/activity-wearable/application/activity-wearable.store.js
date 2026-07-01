// PATH: src/app/activity-wearable/application/activity-wearable.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ActivityWearableApi } from '../infrastructure/activity-wearable.api.js'
import { ActivityLogAssembler } from '../infrastructure/activity-log.assembler.js'
import { WearableConnectionAssembler } from '../infrastructure/wearable-connection.assembler.js'
import { emit } from '../../shared/infrastructure/event-bus.js'
import { createDomainEvent } from '../../shared/domain/events/domain-event.js'
import { ACTIVITY_LOGGED } from '../../shared/domain/events/event-types.js'

const activityWearableApi = new ActivityWearableApi()

/**
 * Store for activity logs and wearable device connections.
 */
export const useActivityWearableStore = defineStore('activity-wearable', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/activity-log.entity.js').ActivityLog>[]>} */
  const activityLogs = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/wearable-connection.entity.js').WearableConnection>[]>} */
  const wearableConnections = ref([])
  const logsLoaded = ref(false)
  const connectionsLoaded = ref(false)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])

  /**
   * Activity logs from today.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/activity-log.entity.js').ActivityLog>[]>}
   */
  const todayLogs = computed(() =>
    activityLogs.value.filter(l => l.isToday())
  )

  /**
   * Total calories burned today across all logged activities.
   * @type {import('vue').ComputedRef<number>}
   */
  const todayCaloriesBurned = computed(() =>
    todayLogs.value.reduce((sum, l) => sum + l.caloriesBurned, 0)
  )

  /**
   * Total active minutes today.
   * @type {import('vue').ComputedRef<number>}
   */
  const todayActiveMinutes = computed(() =>
    todayLogs.value.reduce((sum, l) => sum + l.durationMinutes, 0)
  )

  /**
   * Google Health wearable connection, if any (most recent wins).
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/wearable-connection.entity.js').WearableConnection>|null>}
   */
  const healthConnection = computed(() => {
    const matches = wearableConnections.value.filter(c => c.provider.value === 'google-health')
    if (matches.length === 0) return null
    // Prefer a connected one; otherwise the most recently authorized.
    return matches.find(c => c.isConnected())
      ?? [...matches].sort((a, b) => String(b.authorizedAt).localeCompare(String(a.authorizedAt)))[0]
  })

  /**
   * Whether Google Health is connected and active.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isHealthConnected = computed(() =>
    healthConnection.value?.isConnected() ?? false
  )

  /**
   * All activity logs sorted newest-first.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/activity-log.entity.js').ActivityLog>[]>}
   */
  const allLogsSorted = computed(() =>
    [...activityLogs.value].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
  )

  /**
   * Most recent strength or HIIT log today, if any.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/activity-log.entity.js').ActivityLog>|null>}
   */
  const lastStrengthOrHiit = computed(() =>
    [...todayLogs.value]
      .filter(l => l.activityType.triggersPostWorkoutBanner())
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0] ?? null
  )

  /**
   * Whether to show the post-workout nutrition banner (last intense workout < 2h ago).
   * @type {import('vue').ComputedRef<boolean>}
   */
  const shouldShowPostWorkoutBanner = computed(() => {
    if (!lastStrengthOrHiit.value) return false
    return lastStrengthOrHiit.value.minutesSinceLogged() < 120
  })

  /**
   * Loads activity logs for a given user from the backend (server-side filtered).
   * @param {string} userId
   * @param {string} [from] - yyyy-MM-dd
   * @param {string} [to] - yyyy-MM-dd
   */
  function fetchActivityLogs(userId, from, to) {
    activityWearableApi.getLogsByUser(Number(userId), from, to)
      .then(response => {
        activityLogs.value = ActivityLogAssembler.toEntitiesFromResponse(response)
        logsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates a new activity log entry.
   * @param {string} userId
   * @param {{ activityType: string, intensity: string, durationMinutes: number, caloriesBurned: number, loggedAt?: Date }} activityData
   */
  function logActivity(userId, activityData) {
    const resource = ActivityLogAssembler.toResource(userId, activityData)
    activityWearableApi.createLog(resource)
      .then(response => {
        const newLog = ActivityLogAssembler.toEntityFromResource(response.data)
        if (newLog) activityLogs.value.push(newLog)
        emit(createDomainEvent(ACTIVITY_LOGGED, {}))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Removes an activity log entry by ID.
   * The backend requires the owner userId as a query param for ownership validation.
   * @param {string} logId
   */
  function removeActivity(logId) {
    const log = activityLogs.value.find(l => l.id === logId)
    if (!log) return
    activityWearableApi.deleteLog(Number(logId), Number(log.userId))
      .then(() => {
        activityLogs.value = activityLogs.value.filter(l => l.id !== logId)
        emit(createDomainEvent(ACTIVITY_LOGGED, {}))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads wearable connections for a given user from the backend.
   * @param {string} userId
   */
  function fetchConnections(userId) {
    return activityWearableApi.getConnectionsByUser(Number(userId))
      .then(response => {
        wearableConnections.value = WearableConnectionAssembler.toEntitiesFromResponse(response)
        connectionsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Connects a Google Health account via OAuth code exchange.
   * The oauthCode must be a real authorization code from the Google OAuth flow.
   * Resolves once the connection list has been refreshed; rejects on failure.
   * @param {string} userId
   * @param {{ oauthCode: string }} authData
   * @returns {Promise<void>}
   */
  function connectHealth(userId, authData) {
    const resource = WearableConnectionAssembler.toResource(userId, 'google-health', authData.oauthCode)
    return activityWearableApi.createConnection(resource)
      .then(() => fetchConnections(userId))
      .catch(error => { errors.value.push(error); throw error })
  }

  /**
   * Manually triggers an activity-data sync for a connection, then refreshes logs.
   * @param {string} connectionId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  function syncHealth(connectionId, userId) {
    return activityWearableApi.syncConnection(Number(connectionId))
      .then(response => {
        const updated = WearableConnectionAssembler.toEntityFromResource(response.data)
        if (updated) replaceConnection(updated)
        fetchActivityLogs(userId)
      })
      .catch(error => { errors.value.push(error); throw error })
  }

  /**
   * Enables or disables automatic syncing for a connection (optimistic, rolls back on failure).
   * @param {string} connectionId
   * @param {boolean} enabled
   * @returns {Promise<void>}
   */
  function setAutoSync(connectionId, enabled) {
    return activityWearableApi.setAutoSync(Number(connectionId), enabled)
      .then(response => {
        const updated = WearableConnectionAssembler.toEntityFromResource(response.data)
        if (updated) replaceConnection(updated)
      })
      .catch(error => { errors.value.push(error); throw error })
  }

  /**
   * Replaces a connection in the list by id, preserving order.
   * @param {ReturnType<import('../domain/model/wearable-connection.entity.js').WearableConnection>} updated
   */
  function replaceConnection(updated) {
    const idx = wearableConnections.value.findIndex(c => c.id === updated.id)
    if (idx >= 0) wearableConnections.value.splice(idx, 1, updated)
    else wearableConnections.value.push(updated)
  }

  /**
   * Disconnects a wearable device. The backend removes the connection (DELETE).
   * @param {string} connectionId
   * @returns {Promise<void>}
   */
  function disconnectWearable(connectionId) {
    return activityWearableApi.deleteConnection(Number(connectionId))
      .then(() => {
        wearableConnections.value = wearableConnections.value.filter(c => c.id !== connectionId)
      })
      .catch(error => { errors.value.push(error); throw error })
  }

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    activityLogs,
    wearableConnections,
    logsLoaded,
    connectionsLoaded,
    errors,
    todayLogs,
    allLogsSorted,
    todayCaloriesBurned,
    todayActiveMinutes,
    healthConnection,
    isHealthConnected,
    lastStrengthOrHiit,
    shouldShowPostWorkoutBanner,
    fetchActivityLogs,
    logActivity,
    removeActivity,
    fetchConnections,
    connectHealth,
    syncHealth,
    setAutoSync,
    disconnectWearable,
    clearErrors,
  }
})
