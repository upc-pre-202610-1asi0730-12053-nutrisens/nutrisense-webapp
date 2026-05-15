/** @typedef {'underweight' | 'normal' | 'overweight' | 'obese'} BmiCategory */

/**
 * @param {number} value
 * @returns {BmiCategory}
 */
function classify(value) {
  if (value < 18.5) return 'underweight'
  if (value < 25) return 'normal'
  if (value < 30) return 'overweight'
  return 'obese'
}

/**
 * @param {number} value - raw BMI value
 * @returns {{ value: number, category: BmiCategory, isNormal(): boolean, isUnderweight(): boolean, isOverweight(): boolean }}
 */
export function BmiResult(value) {
  const category = classify(value)
  return Object.freeze({
    value: Math.round(value * 10) / 10,
    category,
    /** @returns {boolean} */
    isNormal() { return category === 'normal' },
    /** @returns {boolean} */
    isUnderweight() { return category === 'underweight' },
    /** @returns {boolean} overweight or obese */
    isOverweight() { return category === 'overweight' || category === 'obese' },
  })
}
