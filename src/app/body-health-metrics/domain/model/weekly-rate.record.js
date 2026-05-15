/** @readonly */
export const CONSERVATIVE_KG = 0.25
/** @readonly */
export const MODERATE_KG = 0.5
/** @readonly */
export const AGGRESSIVE_KG = 0.75

/**
 * @param {number} kgPerWeek
 * @returns {{ kgPerWeek: number, isAggressive(): boolean, label(): 'conservative' | 'moderate' | 'aggressive' }}
 * @throws {Error} if kgPerWeek is not positive
 */
export function WeeklyRate(kgPerWeek) {
  if (kgPerWeek <= 0) throw new Error(`Weekly rate must be positive, got ${kgPerWeek}`)
  return Object.freeze({
    kgPerWeek,
    /** Above 0.5 kg/week may cause muscle loss. */
    isAggressive() { return kgPerWeek > MODERATE_KG },
    /** @returns {'conservative' | 'moderate' | 'aggressive'} */
    label() {
      if (kgPerWeek <= CONSERVATIVE_KG) return 'conservative'
      if (kgPerWeek <= MODERATE_KG) return 'moderate'
      return 'aggressive'
    },
  })
}
