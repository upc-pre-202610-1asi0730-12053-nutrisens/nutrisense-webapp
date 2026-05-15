/** @typedef {'weight-loss' | 'muscle-gain'} GoalTypeValue */

export const WEIGHT_LOSS = 'weight-loss'
export const MUSCLE_GAIN = 'muscle-gain'

const VALID = new Set([WEIGHT_LOSS, MUSCLE_GAIN])

/**
 * @param {GoalTypeValue} value
 * @returns {{ value: GoalTypeValue, isWeightLoss(): boolean, isMuscleGain(): boolean }}
 */
export function GoalType(value) {
  if (!VALID.has(value)) throw new Error(`Invalid goal type: ${value}`)
  return Object.freeze({
    value,
    /** @returns {boolean} */
    isWeightLoss() { return value === WEIGHT_LOSS },
    /** @returns {boolean} */
    isMuscleGain() { return value === MUSCLE_GAIN },
  })
}
