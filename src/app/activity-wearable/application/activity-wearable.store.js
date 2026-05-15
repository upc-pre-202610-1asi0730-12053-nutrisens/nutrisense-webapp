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
   * Loads activity logs for a given user.
   * @param {string} userId
   */
  function fetchActivityLogs(userId) {
    activityWearableApi.getLogs()
      .then(response => {
        const all = ActivityLogAssembler.toEntitiesFromResponse(response)
        activityLogs.value = all.filter(l => l.userId === userId)
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
   * @param {string} logId
   */
  function removeActivity(logId) {
    activityWearableApi.deleteLog(logId)
      .then(() => {
        activityLogs.value = activityLogs.value.filter(l => l.id !== logId)
        emit(createDomainEvent(ACTIVITY_LOGGED, {}))
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads wearable connections for a given user.
   * @param {string} userId
   */
  function fetchConnections(userId) {
    activityWearableApi.getConnections()
      .then(response => {
        const all = WearableConnectionAssembler.toEntitiesFromResponse(response)
        wearableConnections.value = all.filter(c => c.userId === userId)
        connectionsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Creates a Google Fit connection for the given user.
   * @param {string} userId
   * @param {{ accessToken: string, refreshToken: string }} authData
   */
  function connectGoogleFit(userId, authData) {
    const resource = {
      userId,
      provider: 'google-fit',
      status: 'connected',
      authorizedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    }
    activityWearableApi.createConnection(resource)
      .then(response => {
        const newConnection = WearableConnectionAssembler.toEntityFromResource(response.data)
        if (newConnection) wearableConnections.value.push(newConnection)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Marks a wearable connection as disconnected.
   * @param {string} connectionId
   */
  function disconnectWearable(connectionId) {
    activityWearableApi.updateConnection(connectionId, { status: 'disconnected' })
      .then(response => {
        const updated = WearableConnectionAssembler.toEntityFromResource(response.data)
        const idx = wearableConnections.value.findIndex(c => c.id === connectionId)
        if (idx !== -1 && updated) wearableConnections.value.splice(idx, 1, updated)
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