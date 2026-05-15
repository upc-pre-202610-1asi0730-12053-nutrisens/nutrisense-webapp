import { UserGoal } from '../domain/model/user-goal.entity.js'

export class UserGoalAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof UserGoal>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return UserGoal({
        id: resource.id,
        userId: resource.userId,
        goal: resource.goal,
        startWeightKg: resource.startWeightKg,
        targetWeightKg: resource.targetWeightKg,
        weeklyRateKg: resource.weeklyRateKg,
        dailyCalorieTarget: resource.dailyCalorieTarget,
        proteinTargetG: resource.proteinTargetG,
        carbsTargetG: resource.carbsTargetG,
        fatTargetG: resource.fatTargetG,
        fiberTargetG: resource.fiberTargetG,
        caloricAdjustment: resource.caloricAdjustment,
        setAt: resource.setAt,
        active: resource.active,
      })
    } catch (e) {
      console.error('[UserGoalAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof UserGoal>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => UserGoalAssembler.toEntityFromResource(r)).filter(Boolean)
  }
}
