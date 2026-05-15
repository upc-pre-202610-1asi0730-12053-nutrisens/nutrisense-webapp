export class BaseEndpoint {
  /** @type {import('./base-api.js').BaseApi} */
  #api
  /** @type {string} */
  #path

  /**
   * @param {import('./base-api.js').BaseApi} api
   * @param {string} path - route path, e.g. '/users'
   */
  constructor(api, path) {
    this.#api = api
    this.#path = path
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getAll() {
    return this.#api.http.get(this.#path)
  }

  /**
   * @param {Record<string, string|number>} params
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getWhere(params) {
    return this.#api.http.get(this.#path, { params })
  }

  /**
   * @param {string|number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getById(id) {
    return this.#api.http.get(`${this.#path}/${id}`)
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  create(resource) {
    return this.#api.http.post(this.#path, resource)
  }

  /**
   * @param {string|number} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  update(id, resource) {
    return this.#api.http.put(`${this.#path}/${id}`, resource)
  }

  /**
   * @param {string|number} id
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  patch(id, resource) {
    return this.#api.http.patch(`${this.#path}/${id}`, resource)
  }

  /**
   * @param {string|number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  delete(id) {
    return this.#api.http.delete(`${this.#path}/${id}`)
  }
}
