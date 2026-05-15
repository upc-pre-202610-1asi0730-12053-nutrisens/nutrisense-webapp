import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class IamApi extends BaseApi {
  #users
  #sessions
  #signIn
  #signUp

  constructor() {
    super()
    this.#users = new BaseEndpoint(this, import.meta.env.VITE_USERS_ENDPOINT)
    this.#sessions = new BaseEndpoint(this, import.meta.env.VITE_SESSIONS_ENDPOINT)
    this.#signIn = new BaseEndpoint(this, import.meta.env.VITE_AUTH_SIGNIN_ENDPOINT)
    this.#signUp = new BaseEndpoint(this, import.meta.env.VITE_AUTH_SIGNUP_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getMe() {
    return this.#users.getAll()
  }

  /**
   * @param {string} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateProfile(id, resource) {
    return this.#users.patch(id, resource)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getSessions() {
    return this.#sessions.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  revokeSession(id) {
    return this.#sessions.delete(id)
  }

  /**
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  signIn(credentials) {
    return this.#signIn.create(credentials)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  signUp(resource) {
    return this.#signUp.create(resource)
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteAccount(id) {
    return this.#users.delete(id)
  }
}
