import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

export class SmartRecommendationsApi extends BaseApi {
  #recommendationCards
  #recipes
  #pantry
  #cities
  #ingredientCatalog

  constructor() {
    super()
    this.#recommendationCards = new BaseEndpoint(this, import.meta.env.VITE_RECOMMENDATION_CARDS_ENDPOINT)
    this.#recipes = new BaseEndpoint(this, import.meta.env.VITE_RECIPES_ENDPOINT)
    this.#pantry = new BaseEndpoint(this, import.meta.env.VITE_PANTRY_ENDPOINT)
    this.#cities = new BaseEndpoint(this, import.meta.env.VITE_CITIES_ENDPOINT)
    this.#ingredientCatalog = new BaseEndpoint(this, import.meta.env.VITE_INGREDIENT_CATALOG_ENDPOINT)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getRecommendations() {
    return this.#recommendationCards.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getRecommendationById(id) {
    return this.#recommendationCards.getById(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getRecipes() {
    return this.#recipes.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getRecipeById(id) {
    return this.#recipes.getById(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getPantryItems() {
    return this.#pantry.getAll()
  }

  /**
   * @param {Object} resource
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createPantryItem(resource) {
    return this.#pantry.create(resource)
  }

  /**
   * @param {string} id
   * @param {Partial<{quantity: number, unit: string}>} patch
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  patchPantryItem(id, patch) {
    return this.#pantry.patch(id, patch)
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deletePantryItem(id) {
    return this.#pantry.delete(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getCities() {
    return this.#cities.getAll()
  }

  /**
   * @param {string} id
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getCityById(id) {
    return this.#cities.getById(id)
  }

  /** @returns {Promise<import('axios').AxiosResponse>} */
  getIngredientCatalog() {
    return this.#ingredientCatalog.getAll()
  }
}
