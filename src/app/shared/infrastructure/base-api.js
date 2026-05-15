import axios from 'axios'

export class BaseApi {
  /** @type {import('axios').AxiosInstance} */
  #http

  constructor() {
    this.#http = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
    })
  }

  /** @returns {import('axios').AxiosInstance} */
  get http() {
    return this.#http
  }
}
