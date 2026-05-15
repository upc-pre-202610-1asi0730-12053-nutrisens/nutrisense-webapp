import { NutritionLog } from '../domain/model/nutrition-log.entity.js'

export class NutritionLogAssembler {
  /**
   * Builds the API request body for logging a catalogued food.
   * @param {string} userId
   * @param {ReturnType<import('../domain/model/food.entity.js').Food>} food
   * @param {number} grams
   * @param {string} mealType
   * @param {string} source
   * @param {string} date - local YYYY-MM-DD string
   * @returns {Object}
   */
  static toResource(userId, food, grams, mealType, source, date) {
    const macros = food.macrosForQuantity(grams)
    return {
      userId,
      foodId:    food.id,
      foodKey:   food.key,
      mealType,
      source,
      date,
      quantityG: grams,
      calories:  macros.calories,
      proteinG:  macros.proteinG,
      carbsG:    macros.carbsG,
      fatG:      macros.fatG,
      fiberG:    macros.fiberG,
      sugarG:    macros.sugarG,
      loggedAt:  new Date().toISOString(),
    }
  }

  /**
   * Builds the API request body for an estimated log (no food catalog entry).
   * @param {string} userId
   * @param {string|null} foodId
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
      foodKey:   customFoodName,
      mealType,
      source,
      date,
      quantityG: 100,
      calories:  macros.calories,
      proteinG:  macros.proteinG,
      carbsG:    macros.carbsG,
      fatG:      macros.fatG,
      fiberG:    0,
      sugarG:    0,
      loggedAt:  new Date().toISOString(),
    }
  }

  /**
   * Builds the API request body for logging a recipe scaled to a number of servings.
   * @param {string} userId
   * @param {ReturnType<import('../../../smart-recommendations/domain/model/recipe.entity.js').Recipe>} recipe
   * @param {number} servings
   * @param {string} mealType
   * @param {string} date - local YYYY-MM-DD string
   * @returns {Object}
   */
  static toResourceFromRecipe(userId, recipe, servings, mealType, date) {
    const macros = recipe.totalMacros.scale(servings)
    return {
      userId,
      foodId:    recipe.id,
      foodKey:   recipe.key,
      mealType,
      source:    'recipe',
      date,
      quantityG: Math.round(servings * 100),
      calories:  Math.round(macros.calories),
      proteinG:  Math.round(macros.proteinG * 10) / 10,
      carbsG:    Math.round(macros.carbsG   * 10) / 10,
      fatG:      Math.round(macros.fatG     * 10) / 10,
      fiberG:    Math.round((macros.fiberG  ?? 0) * 10) / 10,
      sugarG:    Math.round((macros.sugarG  ?? 0) * 10) / 10,
      loggedAt:  new Date().toISOString(),
    }
  }

  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof NutritionLog>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return NutritionLog({
        id: resource.id,
        userId: resource.userId,
        foodId: resource.foodId,
        foodKey: resource.foodKey,
        mealType: resource.mealType,
        date: resource.date,
        quantityG: resource.quantityG,
        calories: resource.calories,
        proteinG: resource.proteinG,
        carbsG: resource.carbsG,
        fatG: resource.fatG,
        fiberG: resource.fiberG ?? 0,
        sugarG: resource.sugarG ?? 0,
        source: resource.source,
        loggedAt: resource.loggedAt,
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
