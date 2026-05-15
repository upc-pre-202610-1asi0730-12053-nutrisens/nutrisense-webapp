/**
 * @typedef {Object} MacrosData
 * @property {number} calories
 * @property {number} proteinG
 * @property {number} carbsG
 * @property {number} fatG
 * @property {number} [fiberG]
 * @property {number} [sugarG]
 */

/**
 * Rounds a macro value to one decimal place to avoid floating-point noise.
 * @param {number} n
 * @returns {number}
 */
function r1(n) { return Math.round(n * 10) / 10 }

/**
 * Immutable nutritional macros value object.
 * All values are rounded to one decimal place at construction time.
 * @param {MacrosData} data
 */
export function Macros({ calories, proteinG, carbsG, fatG, fiberG = 0, sugarG = 0 }) {
  const _cal  = Math.round(calories)
  const _pro  = r1(proteinG)
  const _carb = r1(carbsG)
  const _fat  = r1(fatG)
  const _fib  = r1(fiberG)
  const _sug  = r1(sugarG)

  return Object.freeze({
    calories: _cal,
    proteinG: _pro,
    carbsG:   _carb,
    fatG:     _fat,
    fiberG:   _fib,
    sugarG:   _sug,
    /**
     * @param {ReturnType<typeof Macros>} other
     * @returns {ReturnType<typeof Macros>}
     */
    add(other) {
      return Macros({
        calories: _cal  + other.calories,
        proteinG: _pro  + other.proteinG,
        carbsG:   _carb + other.carbsG,
        fatG:     _fat  + other.fatG,
        fiberG:   _fib  + other.fiberG,
        sugarG:   _sug  + other.sugarG,
      })
    },
    /**
     * @param {number} factor
     * @returns {ReturnType<typeof Macros>}
     */
    scale(factor) {
      return Macros({
        calories: _cal  * factor,
        proteinG: _pro  * factor,
        carbsG:   _carb * factor,
        fatG:     _fat  * factor,
        fiberG:   _fib  * factor,
        sugarG:   _sug  * factor,
      })
    },
  })
}

/** @returns {ReturnType<typeof Macros>} */
export function emptyMacros() {
  return Macros({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
}
