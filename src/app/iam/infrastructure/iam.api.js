import { BaseApi } from '../../shared/infrastructure/base-api.js'

export class IamApi extends BaseApi {
  constructor() {
    super()
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  /**
   * @param {{ email: string, password: string, deviceLabel?: string }} credentials
   * @returns {Promise<{ userId: number, token: string, sessionId: number }>}
   */
  signIn(credentials) {
    return this.http.post('/authentication/sign-in', credentials).then(r => r.data)
  }

  /**
   * @param {{ email: string, password: string, firstName: string, lastName: string, preferredLanguage: string }} resource
   * @returns {Promise<{ userId: number, token: string, sessionId: number }>}
   */
  signUp({ email, password, firstName, lastName, preferredLanguage }) {
    return this.http
      .post('/authentication/sign-up', { email, password, firstName, lastName, preferredLanguage })
      .then(r => r.data)
  }

  /**
   * Requests a password reset link. Always resolves on a registered or
   * unregistered email alike (the backend never reveals which), so callers
   * should show the same confirmation regardless.
   * @param {string} email
   * @returns {Promise<{ message: string }>}
   */
  requestPasswordReset(email) {
    return this.http.post('/authentication/forgot-password', { email }).then(r => r.data)
  }

  /**
   * Sets a new password using a reset token received by email.
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<{ message: string }>}
   */
  resetPassword(token, newPassword) {
    return this.http.post('/authentication/reset-password', { token, newPassword }).then(r => r.data)
  }

  // ── User ─────────────────────────────────────────────────────────────────────

  /**
   * Fetches the current user together with fields not in UserResource.
   * Fires 4 parallel requests and merges them into a single plain object
   * ready for UserAssembler.
   * goal  ← GET /body-metrics/by-user/{id}      → bodyMetrics.activeGoal
   * plan  ← GET /user-subscriptions/by-user/{id} → subscription.planKey
   * homeCityId ← GET /location-preferences/by-user/{id} → locationPref.homeCityId
   *
   * @param {number} userId
   * @returns {Promise<Object>} merged user resource (camelCase)
   */
  getMe(userId) {
    return Promise.all([
      this.http.get(`/users/${userId}`),
      this.http.get(`/body-metrics/by-user/${userId}`).catch(() => ({ data: null })),
      this.http.get(`/user-subscriptions/by-user/${userId}`).catch(() => ({ data: null })),
      this.http.get(`/location-preferences/by-user/${userId}`).catch(() => ({ data: null })),
    ]).then(([userRes, metricsRes, subRes, locRes]) => ({
      ...userRes.data,
      // UserResource.Goal comes from User.GoalIntent; fall back to BodyMetrics.ActiveGoal.
      goal:       userRes.data.goal ?? metricsRes.data?.activeGoal ?? null,
      plan:       subRes.data?.planKey    ?? null,
      homeCityId: locRes.data?.homeCityId ?? null,
    }))
  }

  /**
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteAccount(id) {
    return this.http.delete(`/users/${id}`)
  }

  // ── Profile updates (decomposed) ────────────────────────────────────────────

  /**
   * PUT /users/{id}/profile
   * Accepts: firstName, lastName, dateOfBirth, biologicalSex, heightCm,
   *          activityLevel, preferredUnits, preferredLanguage, medicalConditions
   * @param {number} id
   * @param {Object} profileFields
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateUserProfile(id, profileFields) {
    return this.http.put(`/users/${id}/profile`, profileFields)
  }

  /**
   * PUT /users/{id}/health-goal
   * @param {number} id
   * @param {string} goal  e.g. 'weight-loss'
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  setHealthGoal(id, goal) {
    return this.http.put(`/users/${id}/health-goal`, { goal })
  }

  /**
   * PUT /users/{id}/dietary-restrictions
   * @param {number} id
   * @param {string[]} restrictions
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  setDietaryRestrictions(id, restrictions) {
    return this.http.put(`/users/${id}/dietary-restrictions`, { restrictions })
  }

  /**
   * PUT /location-preferences/{userId}/home-city
   * Note: cityId must be an integer (backend City.Id). The frontend city picker
   * currently stores integer IDs resolved via GET /cities.
   * @param {number} userId
   * @param {number} cityId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  setHomeCity(userId, cityId) {
    return this.http.put(`/location-preferences/${userId}/home-city`, { cityId })
  }

  // ── Sessions ─────────────────────────────────────────────────────────────────

  /**
   * @param {number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getSessions(userId) {
    return this.http.get(`/users/${userId}/sessions`)
  }

  /**
   * POST /users/{userId}/sessions/{sessionId}/logout
   * Backend uses POST (not DELETE) to terminate a session.
   * @param {number} userId
   * @param {number} sessionId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  revokeSession(userId, sessionId) {
    return this.http.post(`/users/${userId}/sessions/${sessionId}/logout`)
  }
}
