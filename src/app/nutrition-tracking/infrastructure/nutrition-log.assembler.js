import { NutritionLog } from '../domain/model/nutrition-log.entity.js'

/** @param {string} s */
function _mapSource(s) {
  if (s === 'scan-dish') return 'scan-dish'
  if (s === 'scan-menu') return 'scan-menu'
  return 'manual'
}

export class NutritionLogAssembler {
  /**
   * Builds the API request body for logging a catalogued food.
   * @param {number|string} userId
   * @param {number|string} foodId
   * @param {number} grams
   * @param {string} mealType
   * @param {string} source
   * @param {string} date - local YYYY-MM-DD string
   * @returns {Object}
   */
  static toResource(userId, foodId, grams, mealType, source, date) {
    return {
      userId,
      foodId,
      mealType,
      date,
      quantityG: grams,
      source: _mapSource(source),
    }
  }

  /**
   * Builds the API request body for an estimated log (no food catalog entry).
   * @param {number|string} userId
   * @param {number|string|null} foodId
   * @param {string} customFoodName
   * @param {{ calories: number, proteinG: number, carbsG: number, fatG: number }} macros
   * @param {string} mealType
   * @param {string} source
   * @param {string} date - local YYYY-MM-DD string
   * @returns {Object}
   */
  static toResourceFromEstimate(userId, foodId, customFoodName, macros, mealType, source, date) {
    return {
      userId,
      foodId:    foodId ?? null,
      mealType,
      date,
      quantityG: 100,
      source:    _mapSource(source),
    }
  }

  /**
   * Builds the API request body for logging a recipe scaled to a number of servings.
   * @param {number|string} userId
   * @param {ReturnType<import('../../../smart-recommendations/domain/model/recipe.entity.js').Recipe>} recipe
   * @param {number} servings
   * @param {string} mealType
   * @param {string} date - local YYYY-MM-DD string
   * @returns {Object}
   */
  static toResourceFromRecipe(userId, recipe, servings, mealType, date) {
    return {
      userId,
      foodId:    recipe.id,
      mealType,
      date,
      quantityG: Math.round(servings * 100),
      source:    'manual',
    }
  }

  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof NutritionLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return NutritionLog({
        id:        resource.id,
        userId:    resource.userId,
        foodId:    resource.foodId,
        nameEn:    resource.foodNameEn ?? resource.foodNameEs ?? '',
        nameEs:    resource.foodNameEs ?? resource.foodNameEn ?? '',
        mealType:  resource.mealType,
        date:      resource.date,
        quantityG: resource.quantityG,
        calories:  resource.calories,
        proteinG:  resource.proteinG,
        carbsG:    resource.carbsG,
        fatG:      resource.fatG,
        fiberG:    resource.fiberG ?? 0,
        sugarG:    resource.sugarG ?? 0,
        source:    resource.source,
        loggedAt:  resource.loggedAt,
      })
    } catch (e) {
      console.error('[NutritionLogAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof NutritionLog>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => NutritionLogAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof NutritionLog>|null}
   */
  static toEntityFromResponse(response) {
    return NutritionLogAssembler.toEntityFromResource(response.data)
  }
}
