import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class SmartRecommendationsApi extends BaseApi {
  #recipes
  #cities
  #ingredientCatalog

  constructor() {
    super()
    this.#recipes = new BaseEndpoint(this, import.meta.env.VITE_RECIPES_ENDPOINT)
    this.#cities = new BaseEndpoint(this, import.meta.env.VITE_CITIES_ENDPOINT)
    this.#ingredientCatalog = new BaseEndpoint(this, import.meta.env.VITE_INGREDIENT_CATALOG_ENDPOINT)
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getRecommendationsByUser(userId) {
    return this.http.get(`${import.meta.env.VITE_RECOMMENDATION_CARDS_ENDPOINT}/${userId}`)
  }

  /**
   * @param {string} [goal]
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getRecipes(goal) {
    return goal
      ? this.http.get(import.meta.env.VITE_RECIPES_ENDPOINT, { params: { goal } })
      : this.#recipes.getAll()
  }

  /**
   * @param {number} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getRecipeById(id) {
    return this.#recipes.getById(id)
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getPantryByUser(userId) {
    return this.http.get(`${import.meta.env.VITE_PANTRY_ENDPOINT}/by-user/${userId}`)
  }

  /**
   * @param {string|number} userId
   * @param {Array<{ingredientCatalogItemId: number, quantity: number, unit: string}>} items
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  registerPantryItems(userId, items) {
    return this.http.post(`${import.meta.env.VITE_PANTRY_ENDPOINT}/${userId}/items`, { items })
  }

  /**
   * @param {string|number} userId
   * @param {number} itemId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deletePantryItem(userId, itemId) {
    return this.http.delete(`${import.meta.env.VITE_PANTRY_ENDPOINT}/${userId}/items/${itemId}`)
  }

  /**
   * @param {string|number} userId
   * @param {number} id
   * @param {{quantity: number, unit: string}} patch
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  patchPantryItem(userId, id, patch) {
    return this.http.patch(`${import.meta.env.VITE_PANTRY_ENDPOINT}/${userId}/items/${id}`, patch)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getCities() {
    return this.#cities.getAll()
  }

  /**
   * Current weather for a city.
   * @param {number} cityId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getWeatherByCity(cityId) {
    return this.http.get(`${import.meta.env.VITE_CITIES_ENDPOINT}/${cityId}/weather`)
  }

  /**
   * Searches cities by name (local catalog + OpenWeatherMap geocoding candidates).
   * @param {string} q
   * @param {number} [limit]
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  searchCities(q, limit = 5) {
    return this.http.get(`${import.meta.env.VITE_CITIES_ENDPOINT}/search`, { params: { q, limit } })
  }

  /**
   * Imports (or reuses) a geocoded city into the catalog; returns it with a real ID.
   * @param {{ name: string, nameEn?: string, nameEs?: string, country: string, lat: number, lng: number }} candidate
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  importCity(candidate) {
    return this.http.post(import.meta.env.VITE_CITIES_ENDPOINT, candidate)
  }

  /**
   * Detects the user's current city from GPS coordinates (persists it server-side).
   * @param {string|number} userId
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  detectLocation(userId, lat, lng) {
    return this.http.post(`/location-preferences/${userId}/detect`, { lat, lng })
  }

  /**
   * Retrieves the user's persisted location preferences (home/current city, travel mode, permission intent).
   * @param {string|number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getLocationPreference(userId) {
    return this.http.get(`/location-preferences/by-user/${userId}`)
  }

  /**
   * Persists the user's location-permission intent (account-level, drives UX across devices).
   * @param {string|number} userId
   * @param {boolean} granted
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  setLocationPermission(userId, granted) {
    return this.http.put(`/location-preferences/${userId}/permission`, { granted })
  }

  /**
   * Enables travel mode for a city server-side, which also regenerates the user's recommendations
   * for that city. Pro-gated on the backend.
   * @param {string|number} userId
   * @param {number} cityId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  enableTravelMode(userId, cityId) {
    return this.http.put(`/location-preferences/${userId}/travel-mode/enable`, { cityId })
  }

  /**
   * Disables travel mode for a user server-side.
   * @param {string|number} userId
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  disableTravelMode(userId) {
    return this.http.put(`/location-preferences/${userId}/travel-mode/disable`)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getIngredientCatalog() {
    return this.#ingredientCatalog.getAll()
  }
}
