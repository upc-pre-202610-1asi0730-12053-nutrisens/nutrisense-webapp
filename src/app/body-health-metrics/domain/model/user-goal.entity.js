import { GoalType } from '../../../shared/domain/model/goal-type.record.js'
import { MacroTargets } from './macro-targets.record.js'
import { WeeklyRate } from './weekly-rate.record.js'

/**
 * @typedef {Object} UserGoalProps
 * @property {string} id
 * @property {string} userId
 * @property {import('../../../../shared/domain/model/goal-type.record.js').GoalTypeValue} goal
 * @property {number} startWeightKg
 * @property {number} targetWeightKg
 * @property {number} weeklyRateKg
 * @property {number} dailyCalorieTarget
 * @property {number} proteinTargetG
 * @property {number} carbsTargetG
 * @property {number} fatTargetG
 * @property {number} fiberTargetG
 * @property {number} caloricAdjustment - negative = deficit, positive = surplus
 * @property {string} setAt
 * @property {boolean} active
 */

/** @param {UserGoalProps} props */
export function UserGoal(props) {
  const goal = GoalType(props.goal)
  const weeklyRate = WeeklyRate(props.weeklyRateKg)
  const macroTargets = MacroTargets({
    dailyCalorieTarget: props.dailyCalorieTarget,
    proteinTargetG: props.proteinTargetG,
    carbsTargetG: props.carbsTargetG,
    fatTargetG: props.fatTargetG,
    fiberTargetG: props.fiberTargetG,
  })

  return Object.freeze({
    id: props.id,
    userId: props.userId,
    goal,
    startWeightKg: props.startWeightKg,
    targetWeightKg: props.targetWeightKg,
    weeklyRate,
    macroTargets,
    caloricAdjustment: props.caloricAdjustment,
    setAt: props.setAt,
    active: props.active,

    /** @returns {boolean} */
    isActive() { return props.active },
    /**
     * @param {number} currentWeightKg
     * @returns {number} weeks remaining; 0 if goal already reached
     */
    estimatedWeeksToGoal(currentWeightKg) {
      const remaining = Math.abs(currentWeightKg - props.targetWeightKg)
      return remaining <= 0 ? 0 : Math.ceil(remaining / props.weeklyRateKg)
    },
    /**
     * @param {number} currentWeightKg
     * @returns {number} kg progress from start (negative = lost, positive = gained)
     */
    weightProgress(currentWeightKg) { return currentWeightKg - props.startWeightKg },
    /** @returns {boolean} */
    isDeficit() { return props.caloricAdjustment < 0 },
    /** @returns {boolean} */
    isSurplus() { return props.caloricAdjustment > 0 },
  })
}
