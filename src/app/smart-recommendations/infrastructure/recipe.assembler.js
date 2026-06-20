import { Recipe } from '../domain/model/recipe.entity.js'

export class RecipeAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof Recipe>|null}
   */
  static toEntityFromResource(resource) {
    try {
      const ingredients = (resource.ingredients ?? []).map(i => ({
        ingredientId: i.ingredientCatalogItemId,
        quantity: i.quantity,
        unit: i.unit,
      }))

      return Recipe({
        id: resource.id,
        key: resource.key,
        nameEn: resource.nameEn ?? '',
        nameEs: resource.nameEs ?? '',
        goalType: resource.goalType,
        prepTimeMinutes: resource.prepTimeMinutes,
        servings: resource.servings,
        totalCalories: resource.totalCalories,
        totalProteinG: resource.totalProteinG,
        totalCarbsG: resource.totalCarbsG,
        totalFatG: resource.totalFatG,
        totalFiberG: resource.totalFiberG ?? 0,
        restrictionsConflict: resource.restrictionsConflict ?? [],
        ingredients,
      })
    } catch (e) {
      console.error('[RecipeAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof Recipe>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => RecipeAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof Recipe>|null}
   */
  static toEntityFromResponse(response) {
    return RecipeAssembler.toEntityFromResource(response.data)
  }
}
