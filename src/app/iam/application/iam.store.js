// PATH: src/app/iam/application/iam.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IamApi } from '../infrastructure/iam.api.js'
import { UserAssembler } from '../infrastructure/user.assembler.js'
import { DietaryRestrictionAssembler } from '../infrastructure/dietary-restriction.assembler.js'
import { UserSessionAssembler } from '../infrastructure/user-session.assembler.js'

import { on } from '../../shared/infrastructure/event-bus.js'
import { SUBSCRIPTION_ACTIVATED } from '../../shared/domain/events/event-types.js'

const iamApi = new IamApi()

/**
 * Store for identity and access management.
 * Manages current user, sessions, dietary restrictions, and auth flow.
 */
export const useIamStore = defineStore('iam', () => {
  /** @type {import('vue').Ref<ReturnType<import('../domain/model/user.entity.js').User>|null>} */
  const currentUser = ref(null)
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
   * Loads the current user by ID from the user list.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  function fetchCurrentUser(userId) {
    return iamApi.getMe()
      .then(response => {
        const users = UserAssembler.toEntitiesFromResponse(response)
        currentUser.value = users.find(u => u.id === userId) ?? null
        userLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Updates profile data for the current user.
   * @param {Object} profileData
   */
  function updateProfile(profileData) {
    if (!currentUser.value) return Promise.resolve(null)
    return iamApi.updateProfile(currentUser.value.id, profileData)
      .then(response => {
        currentUser.value = UserAssembler.toEntityFromResponse(response)
        return currentUser.value
      })
      .catch(error => {
        errors.value.push(error)
        throw error
      })
  }

  /**
   * Loads all active sessions for the current user.
   */
  function fetchSessions() {
    iamApi.getSessions()
      .then(response => {
        sessions.value = UserSessionAssembler.toEntitiesFromResponse(response)
        sessionsLoaded.value = true
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Revokes a specific session by ID.
   * @param {string} sessionId
   */
  function revokeSession(sessionId) {
    iamApi.revokeSession(sessionId)
      .then(() => {
        sessions.value = sessions.value.filter(s => s.id !== sessionId)
      })
      .catch(error => errors.value.push(error))
  }

  /**
   * Loads dietary restrictions for the current user.
   * Requires a dietary restrictions endpoint in the API (not yet implemented).
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
        userId: currentUser.value?.id ?? '',
        restriction: r,
      })
    ).filter(Boolean)
  }

  /**
   * Authenticates the user by finding a matching email in the user list (mock).
   * Returns the matched User entity, or null if not found.
   * @param {string} email
   * @param {string} _password
   * @returns {Promise<ReturnType<import('../domain/model/user.entity.js').User>|null>}
   */
  function signIn(email, _password) {
    return iamApi.getMe()
      .then(response => {
        const users = UserAssembler.toEntitiesFromResponse(response)
        const normalizedEmail = email.toLowerCase().trim()
        const user = users.find(u => u.email.value === normalizedEmail) ?? null
        if (user) {
          currentUser.value = user
          userLoaded.value = true
        }
        return user
      })
      .catch(error => { errors.value.push(error); return null })
  }

  /**
   * Clears all auth state and removes the stored token.
   */
  function signOut() {
    currentUser.value = null
    sessions.value = []
    dietaryRestrictions.value = []
    userLoaded.value = false
    localStorage.removeItem('ns_user_id')
  }

  /**
   * Registers a new user account. Returns response data for the component to handle.
   * Rejects with Error('email_already_registered') if the email is already in use.
   * @param {Object} formData
   * @returns {Promise<Object>}
   */
  function signUp(formData) {
    return iamApi.getMe()
      .then(response => {
        const users = UserAssembler.toEntitiesFromResponse(response)
        const normalized = formData.email?.toLowerCase().trim()
        if (users.some(u => u.email.value === normalized)) {
          throw new Error('email_already_registered')
        }
        return iamApi.signUp(formData)
      })
      .then(response => response.data)
      .catch(error => { errors.value.push(error); throw error })
  }

  /**
   * Permanently deletes the current user account and clears all state.
   */
  function deleteAccount() {
    if (!currentUser.value) return
    iamApi.deleteAccount(currentUser.value.id)
      .then(() => {
        currentUser.value = null
        sessions.value = []
        dietaryRestrictions.value = []
        userLoaded.value = false
        localStorage.removeItem('ns_user_id')
      })
      .catch(error => errors.value.push(error))
  }

  on(SUBSCRIPTION_ACTIVATED, ({ userId }) => {
    fetchCurrentUser(userId)
  })

  /** Clears the errors array. */
  function clearErrors() {
    errors.value = []
  }

  return {
    currentUser,
    sessions,
    dietaryRestrictions,
    userLoaded,
    sessionsLoaded,
    restrictionsLoaded,
    errors,
    isAuthenticated,
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
