import { BmiResult } from '../model/bmi-result.record.js'

/**
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {ReturnType<typeof BmiResult>}
 */
export function calculateBmi(weightKg, heightCm) {
  const heightM = heightCm / 100
  return BmiResult(weightKg / (heightM * heightM))
}

/**
 * Mifflin-St Jeor equation.
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} ageYears
 * @param {'male' | 'female' | 'prefer-not-to-say'} biologicalSex
 * @returns {number} kcal/day at complete rest
 */
export function calculateBmr(weightKg, heightCm, ageYears, biologicalSex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return biologicalSex === 'female' ? base - 161 : base + 5
}

/**
 * @param {number} bmr
 * @param {number} palMultiplier - from ActivityLevel.palMultiplier()
 * @returns {number} kcal/day maintenance
 */
export function calculateTdee(bmr, palMultiplier) {
  return Math.round(bmr * palMultiplier)
}
