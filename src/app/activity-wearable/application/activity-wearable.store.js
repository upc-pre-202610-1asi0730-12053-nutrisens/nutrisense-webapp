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
   * Google Fit wearable connection, if any.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/wearable-connection.entity.js').WearableConnection>|null>}
   */
  const googleFitConnection = computed(() =>
    wearableConnections.value.find(c => c.provider.value === 'google-fit') ?? null
  )

  /**
   * Whether Google Fit is connected and active.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isGoogleFitConnected = computed(() =>
    googleFitConnection.value?.isConnected() ?? false
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
    activityWearableApi.getConnectionsByUser(Number(userId))
      .then(response => {
        wearableConnections.value = WearableConnectionAssembler.toEntitiesFromResponse(response)
        connectionsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Connects a Google Fit account via OAuth code exchange.
   * The oauthCode must be a real authorization code from the Google OAuth flow.
   * @param {string} userId
   * @param {{ oauthCode: string }} authData
   */
  function connectGoogleFit(userId, authData) {
    const resource = WearableConnectionAssembler.toResource(userId, 'google-fit', authData.oauthCode)
    activityWearableApi.createConnection(resource)
      .then(response => {
        const newConnection = WearableConnectionAssembler.toEntityFromResource(response.data)
        if (newConnection) wearableConnections.value.push(newConnection)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Disconnects a wearable device. The backend removes the connection (DELETE).
   * @param {string} connectionId
   */
  function disconnectWearable(connectionId) {
    activityWearableApi.deleteConnection(Number(connectionId))
      .then(() => {
        wearableConnections.value = wearableConnections.value.filter(c => c.id !== connectionId)
      })
      .catch(error => errors.value.push(error))
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
    googleFitConnection,
    isGoogleFitConnected,
    lastStrengthOrHiit,
    shouldShowPostWorkoutBanner,
    fetchActivityLogs,
    logActivity,
    removeActivity,
    fetchConnections,
    connectGoogleFit,
    disconnectWearable,
    clearErrors,
  }
})
