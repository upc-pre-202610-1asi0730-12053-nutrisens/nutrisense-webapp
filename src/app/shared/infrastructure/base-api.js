import axios from 'axios'

const PUBLIC_PATHS = ['/authentication/sign-in', '/authentication/sign-up']

// Mirrors i18n.js's LOCALE_KEY. Kept as a local literal so this infrastructure
// module stays free of i18n.js's import-time side effects (it reads
// localStorage on load, which breaks in non-browser test environments).
const LOCALE_KEY = 'ns_locale'

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function toCamelDeep(value) {
  if (Array.isArray(value)) return value.map(toCamelDeep)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k.charAt(0).toLowerCase() + k.slice(1),
        toCamelDeep(v),
      ])
    )
  }
  return value
}

export function toPascalDeep(value) {
  if (Array.isArray(value)) return value.map(toPascalDeep)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k.charAt(0).toUpperCase() + k.slice(1),
        toPascalDeep(v),
      ])
    )
  }
  return value
}

export class BaseApi {
  /** @type {import('axios').AxiosInstance} */
  #http

  constructor() {
    this.#http = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
    })

    this.#http.interceptors.request.use(config => {
      const isPublic = PUBLIC_PATHS.some(path => config.url?.includes(path))
      if (!isPublic) {
        const token = localStorage.getItem('ns_token')
        if (token) config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Advertise the user's selected UI locale so the backend can localize
    // its responses (error messages + Content-Language). Resolved per request
    // so it tracks the language switcher; backend falls back to 'en' if absent.
    this.#http.interceptors.request.use(config => {
      const locale = localStorage.getItem(LOCALE_KEY)
      if (locale) config.headers['Accept-Language'] = locale
      return config
    })

    // Runs before the Bearer interceptor (Axios request interceptors are LIFO).
    // Transforms request body keys to PascalCase; query params are untouched.
    this.#http.interceptors.request.use(config => {
      if (config.data) config.data = toPascalDeep(config.data)
      return config
    })

    this.#http.interceptors.response.use(
      response => {
        response.data = toCamelDeep(response.data)
        return response
      },
      error => {
        const url = error.config?.url ?? ''
        const isPublic = PUBLIC_PATHS.some(path => url.includes(path))
        if (error.response?.status === 401 && !isPublic) {
          localStorage.removeItem('ns_token')
          localStorage.removeItem('ns_user_id')
          localStorage.removeItem('ns_session_id')
          if (!window.location.pathname.startsWith('/login')) {
            window.location.replace('/login')
          }
        }
        return Promise.reject(error)
      }
    )
  }

  /** @returns {import('axios').AxiosInstance} */
  get http() {
    return this.#http
  }
}
