// PATH: src/app/smart-recommendations/domain/model/macro-profile.entity.js

/** @typedef {'underweight'|'normal'|'overweight'|'obese'} BmiCategory */
/** @typedef {'weight-loss'|'muscle-gain'} PrimaryGoal */

/**
 * Immutable value object encoding macro preferences derived from BMI category and primary goal.
 * @param {{ minProteinG: number|null, maxCalories: number|null, prioritizeFiber: boolean, labelKey: string }} props
 * @returns {Readonly<{ minProteinG: number|null, maxCalories: number|null, prioritizeFiber: boolean, labelKey: string }>}
 */
export function MacroProfile({ minProteinG, maxCalories, prioritizeFiber, labelKey }) {
  return Object.freeze({ minProteinG, maxCalories, prioritizeFiber, labelKey })
}

/**
 * Derives a MacroProfile from the user's BMI category and primary goal.
 * Underweight always overrides goal to prioritize calorie-dense, protein-rich items.
 * @param {BmiCategory|null} bmiCategory
 * @param {PrimaryGoal|null} primaryGoal
 * @returns {ReturnType<typeof MacroProfile>|null} null when insufficient data
 */
MacroProfile.fromBmiAndGoal = function (bmiCategory, primaryGoal) {
  if (!bmiCategory) return null

  if (bmiCategory === 'underweight') {
    return MacroProfile({
      minProteinG: 18,
      maxCalories: null,
      prioritizeFiber: false,
      labelKey: 'recommendations.profileUnderweight',
    })
  }

  if (primaryGoal === 'muscle-gain') {
    return MacroProfile({
      minProteinG: 20,
      maxCalories: null,
      prioritizeFiber: false,
      labelKey: 'recommendations.profileMuscleGain',
    })
  }

  if (bmiCategory === 'normal') {
    return MacroProfile({
      minProteinG: null,
      maxCalories: 600,
      prioritizeFiber: true,
      labelKey: 'recommendations.profileWeightLossNormal',
    })
  }

  return MacroProfile({
    minProteinG: null,
    maxCalories: 500,
    prioritizeFiber: true,
    labelKey: 'recommendations.profileWeightLossOverweight',
  })
}

/**
 * Scores how well a food item matches the profile (0–2).
 * Higher = better match for boost-sorting.
 * @param {number} calories
 * @param {number} proteinG
 * @param {ReturnType<typeof MacroProfile>} profile
 * @returns {number}
 */
MacroProfile.score = function (calories, proteinG, profile) {
  let score = 0
  if (profile.minProteinG !== null && proteinG >= profile.minProteinG) score++
  if (profile.maxCalories !== null && calories <= profile.maxCalories) score++
  return score
}
