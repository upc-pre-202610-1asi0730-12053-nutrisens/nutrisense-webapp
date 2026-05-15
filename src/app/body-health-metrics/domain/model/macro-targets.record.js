/**
 * @typedef {Object} MacroTargetsProps
 * @property {number} dailyCalorieTarget
 * @property {number} proteinTargetG
 * @property {number} carbsTargetG
 * @property {number} fatTargetG
 * @property {number} fiberTargetG
 */

/** @param {MacroTargetsProps} props */
export function MacroTargets(props) {
  const kcalFromMacros =
    props.proteinTargetG * 4 + props.carbsTargetG * 4 + props.fatTargetG * 9

  return Object.freeze({
    dailyCalorieTarget: props.dailyCalorieTarget,
    proteinTargetG: props.proteinTargetG,
    carbsTargetG: props.carbsTargetG,
    fatTargetG: props.fatTargetG,
    fiberTargetG: props.fiberTargetG,
    /** @returns {number} 0–100 */
    proteinRatio() {
      return kcalFromMacros > 0 ? (props.proteinTargetG * 4 / kcalFromMacros) * 100 : 0
    },
    /** @returns {number} 0–100 */
    carbsRatio() {
      return kcalFromMacros > 0 ? (props.carbsTargetG * 4 / kcalFromMacros) * 100 : 0
    },
    /** @returns {number} 0–100 */
    fatRatio() {
      return kcalFromMacros > 0 ? (props.fatTargetG * 9 / kcalFromMacros) * 100 : 0
    },
  })
}
