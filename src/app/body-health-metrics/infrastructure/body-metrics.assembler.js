import { UserGoal } from '../domain/model/user-goal.entity.js'

export class BodyMetricsAssembler {
  /**
   * Maps a flat BodyMetricsResource (camelCase) to a UserGoal entity.
   * Returns null if no active goal is present in the resource.
   * @param {Object} resource
   * @returns {ReturnType<typeof UserGoal>|null}
   */
  static toUserGoalFromResource(resource) {
    if (!resource.activeGoal) return null
    try {
      return UserGoal({
        id: null,
        userId: resource.userId,
        goal: resource.activeGoal,
        startWeightKg: resource.activeGoalStartWeightKg ?? resource.currentWeightKg ?? 0,
        targetWeightKg: resource.activeGoalTargetWeightKg ?? resource.currentWeightKg ?? 0,
        weeklyRateKg: resource.activeGoalWeeklyRateKg ?? 0.5,
        dailyCalorieTarget: resource.dailyCalories ?? 0,
        proteinTargetG: resource.proteinG ?? 0,
        carbsTargetG: resource.carbsG ?? 0,
        fatTargetG: resource.fatG ?? 0,
        fiberTargetG: resource.fiberG ?? 0,
        caloricAdjustment: resource.activeGoalCaloricAdjustment ?? 0,
        setAt: resource.activeGoalSetAt ?? new Date().toISOString(),
        active: true,
      })
    } catch (e) {
      console.error('[BodyMetricsAssembler] failed to map UserGoal', e)
      return null
    }
  }
}
