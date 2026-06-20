// PATH: src/app/iam/application/iam.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IamApi } from '../infrastructure/iam.api.js'
import { UserAssembler } from '../infrastructure/user.assembler.js'
import { DietaryRestrictionAssembler } from '../infrastructure/dietary-restriction.assembler.js'
import { UserSessionAssembler } from '../infrastructure/user-session.assembler.js'

import { on } from '../../shared/infrastructure/event-bus.js'
import { SUBSCRIPTION_ACTIVATED } from '../../shared/domain/events/event-types.js'
import { useSubscriptionsBillingStore } from '../../subscriptions-billing/application/subscriptions-billing.store.js'

const iamApi = new IamApi()

/**
 * Store for identity and access management.
 * Manages current user, sessions, dietary restrictions, and auth flow.
 */
export const useIamStore = defineStore('iam', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user.entity.js').User>|null>} */
  const currentUser = ref(null)
  /** @type {import('vue').Ref<string|null>} */
  const token = ref(localStorage.getItem('ns_token') ?? null)
  /** @type {import('vue').Ref<number|null>} */
  const sessionId = ref(
    localStorage.getItem('ns_session_id') ? parseInt(localStorage.getItem('ns_session_id'), 10) : null
  )
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user-session.entity.js').UserSession>[]>} */
  const sessions = ref([])
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/dietary-restriction.entity.js').DietaryRestriction>[]>} */
  const dietaryRestrictions = ref([])
  const userLoaded = ref(false)
  const sessionsLoaded = ref(false)
  const restrictionsLoaded = ref(false)
  /** @type {import('vue').Ref<Error[]>} */
  const errors = ref([])

  /**
   * Whether a user is currently authenticated.
   * @type {import('vue').ComputedRef<boolean>}
   */
  const isAuthenticated = computed(() => currentUser.value !== null)

  /**
   * ID (int) of the current user, or null.
   * @type {import('vue').ComputedRef<number|null>}
   */
  const currentUserId = computed(() => {
    const id = currentUser.value?.id
    if (id == null) return null
    const parsed = parseInt(id, 10)
    return Number.isNaN(parsed) ? null : parsed
  })

  /**
   * First name of the current user, or empty string.
   * @type {import('vue').ComputedRef<string>}
   */
  const firstName = computed(() => currentUser.value?.firstName ?? '')

  /**
   * Plan tier of the current user, or null.
   * @type {import('vue').ComputedRef<ReturnType<import('../domain/model/plan-tier.record.js').PlanTier>|null>}
   */
  const currentPlanTier = computed(() => currentUser.value?.plan ?? null)

  /**
   * Returns whether the current user's plan is at least the given tier.
   * @param {import('../domain/model/plan-tier.record.js').PlanTierValue} minimumPlan
   * @returns {boolean}
   */
  function hasFeature(minimumPlan) {
    return currentUser.value?.isOnAtLeastPlan(minimumPlan) ?? false
  }

  /**
   * Persists auth credentials to localStorage and reactive state.
   * @param {number} uid
   * @param {string|null} tok
   * @param {number|null} sid
   */
  function _persistAuth(uid, tok, sid) {
    localStorage.setItem('ns_user_id', String(uid))
    if (tok != null) localStorage.setItem('ns_token', tok)
    if (sid != null) localStorage.setItem('ns_session_id', String(sid))
    token.value = tok ?? token.value
    sessionId.value = sid ?? sessionId.value
  }

  /** Removes all auth credentials from localStorage and reactive state. */
  function _clearAuth() {
    localStorage.removeItem('ns_user_id')
    localStorage.removeItem('ns_token')
    localStorage.removeItem('ns_session_id')
    token.value = null
    sessionId.value = null
  }

  /**
   * Loads the current user by ID via GET /users/{id}.
   * Also fetches goal, plan and homeCityId from their respective endpoints in parallel.
   * @param {number} userId
   * @returns {Promise<void>}
   */
  function fetchCurrentUser(userId) {
    errors.value = []
    return iamApi.getMe(userId)
      .then(merged => {
        currentUser.value = UserAssembler.toEntityFromResource(merged)
        userLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Decomposes a profile update into up to 4 targeted PUT requests,
   * firing only the ones whose fields changed relative to the current user.
   *
   * Decomposition:
   *   PUT /users/{id}/profile            → base identity/physical fields
   *   PUT /users/{id}/health-goal        → goal string
   *   PUT /users/{id}/dietary-restrictions → restrictions array
   *   PUT /location-preferences/{id}/home-city → homeCityId (int)
   *
   * @param {Object} profileData - flat update object from the UI
   * @returns {Promise<ReturnType<import('../domain/model/user.entity.js').User>|null>}
   */
  function updateProfile(profileData) {
    errors.value = []
    if (!currentUser.value) return Promise.resolve(null)

    const user = currentUser.value
    const uid = parseInt(user.id, 10)
    const calls = []

    // ── 1. Base profile fields ───────────────────────────────────────────────
    const profileChanged =
      ('firstName'         in profileData && profileData.firstName        !== user.firstName) ||
      ('lastName'          in profileData && profileData.lastName         !== user.lastName) ||
      ('dateOfBirth'       in profileData && profileData.dateOfBirth      !== user.dateOfBirth) ||
      ('biologicalSex'     in profileData && profileData.biologicalSex    !== user.biologicalSex?.value) ||
      ('heightCm'          in profileData && profileData.heightCm         !== user.heightCm) ||
      ('activityLevel'     in profileData && profileData.activityLevel    !== user.activityLevel?.value) ||
      ('preferredUnits'    in profileData && profileData.preferredUnits   !== user.preferredUnits?.value) ||
      ('preferredLanguage' in profileData && profileData.preferredLanguage !== user.preferredLanguage) ||
      ('medicalConditions' in profileData)

    if (profileChanged) {
      const payload = {}
      if ('firstName'         in profileData) payload.firstName         = profileData.firstName
      if ('lastName'          in profileData) payload.lastName          = profileData.lastName
      if ('dateOfBirth'       in profileData) payload.dateOfBirth       = profileData.dateOfBirth || null
      if ('biologicalSex'     in profileData) payload.biologicalSex     = profileData.biologicalSex
      if ('heightCm'          in profileData) payload.heightCm          = profileData.heightCm
      if ('activityLevel'     in profileData) payload.activityLevel     = profileData.activityLevel
      if ('preferredUnits'    in profileData) payload.preferredUnits    = profileData.preferredUnits
      if ('preferredLanguage' in profileData) payload.preferredLanguage = profileData.preferredLanguage
      if ('medicalConditions' in profileData) payload.medicalConditions = profileData.medicalConditions
      calls.push(iamApi.updateUserProfile(uid, payload))
    }

    // ── 2. Health goal ───────────────────────────────────────────────────────
    if ('goal' in profileData && profileData.goal !== user.goal?.value) {
      calls.push(iamApi.setHealthGoal(uid, profileData.goal))
    }

    // ── 3. Dietary restrictions ──────────────────────────────────────────────
    if ('dietaryRestrictions' in profileData) {
      const prev = (user.dietaryRestrictions ?? []).slice().sort().join(',')
      const next = (profileData.dietaryRestrictions ?? []).slice().sort().join(',')
      if (prev !== next) {
        calls.push(iamApi.setDietaryRestrictions(uid, profileData.dietaryRestrictions))
      }
    }

    // ── 4. Home city (int ID) ────────────────────────────────────────────────
    if ('homeCityId' in profileData) {
      const newId = profileData.homeCityId
      const prevId = user.homeCityId
      if (newId !== prevId && newId != null && Number.isInteger(Number(newId))) {
        calls.push(iamApi.setHomeCity(uid, Number(newId)))
      }
    }

    if (calls.length === 0) return Promise.resolve(user)

    return Promise.all(calls)
      .then(() => fetchCurrentUser(uid).then(() => currentUser.value))
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Loads all active sessions for the current user.
   */
  function fetchSessions() {
    const uid = currentUserId.value
    if (uid == null) return
    errors.value = []
    iamApi.getSessions(uid)
      .then(response => {
        sessions.value = UserSessionAssembler.toEntitiesFromResponse(response)
        sessionsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Revokes a specific session by ID.
   * @param {number} sid - sessionId to revoke
   */
  function revokeSession(sid) {
    const uid = currentUserId.value
    if (uid == null) return
    errors.value = []
    iamApi.revokeSession(uid, sid)
      .then(() => {
        sessions.value = sessions.value.filter(s => s.id !== sid)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads dietary restrictions for the current user.
   */
  function fetchDietaryRestrictions() {
    restrictionsLoaded.value = true
  }

  /**
   * Updates dietary restrictions for the current user.
   * @param {string[]} restrictionsList
   */
  function updateDietaryRestrictions(restrictionsList) {
    dietaryRestrictions.value = restrictionsList.map(r =>
      DietaryRestrictionAssembler.toEntityFromResource({
        id: `dr_${r}`,
        userId: parseInt(currentUser.value?.id, 10) || 0,
        restriction: r,
      })
    ).filter(Boolean)
  }

  /**
   * Authenticates the user via POST /authentication/sign-in.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ userId: number, token: string, sessionId: number }|null>}
   */
  function signIn(email, password) {
    errors.value = []
    return iamApi.signIn({ email, password })
      .then(async ({ userId, token: tok, sessionId: sid }) => {
        _persistAuth(userId, tok, sid)
        await fetchCurrentUser(userId)
        return { userId, token: tok, sessionId: sid }
      })
      .catch(error => { errors.value.push(error); return null })
  }

  /**
   * Clears all auth state and removes all stored credentials.
   */
  function signOut() {
    currentUser.value = null
    sessions.value = []
    dietaryRestrictions.value = []
    userLoaded.value = false
    useSubscriptionsBillingStore().reset()
    _clearAuth()
  }

  /**
   * Registers a new user account via POST /authentication/sign-up.
   * @param {Object} formData
   * @returns {Promise<{ userId: number, token: string, sessionId: number }>}
   */
  function signUp(formData) {
    errors.value = []
    return iamApi.signUp(formData)
      .then(({ userId, token: tok, sessionId: sid }) => {
        // New account starts with a clean billing slate — drop any state left
        // over from a previously authenticated user in this SPA session.
        useSubscriptionsBillingStore().reset()
        _persistAuth(userId, tok, sid)
        return { userId, token: tok, sessionId: sid }
      })
      .catch(error => { errors.value.push(error); throw error })
  }

  /**
   * Permanently deletes the current user account and clears all state.
   * Returns a Promise so callers can chain navigation after completion.
   * @returns {Promise<void>}
   */
  function deleteAccount() {
    errors.value = []
    if (!currentUser.value) return Promise.resolve()
    return iamApi.deleteAccount(currentUser.value.id)
      .then(() => {
        currentUser.value = null
        sessions.value = []
        dietaryRestrictions.value = []
        userLoaded.value = false
        useSubscriptionsBillingStore().reset()
        _clearAuth()
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  on(SUBSCRIPTION_ACTIVATED, ({ userId }) => {
    fetchCurrentUser(parseInt(userId, 10))
  })

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    currentUser,
    token,
    sessionId,
    sessions,
    dietaryRestrictions,
    userLoaded,
    sessionsLoaded,
    restrictionsLoaded,
    errors,
    isAuthenticated,
    currentUserId,
    firstName,
    currentPlanTier,
    hasFeature,
    fetchCurrentUser,
    updateProfile,
    fetchSessions,
    revokeSession,
    fetchDietaryRestrictions,
    updateDietaryRestrictions,
    signIn,
    signOut,
    signUp,
    deleteAccount,
    clearErrors,
  }
})
