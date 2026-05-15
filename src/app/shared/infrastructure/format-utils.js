// PATH: src/app/shared/infrastructure/format-utils.js

/**
 * Formats a numeric value to at most `maxDecimals` decimal places,
 * stripping trailing zeros (e.g. 71.10 → "71.1", 71.123 → "71.12", 71 → "71").
 * Returns "—" for null, undefined, or NaN.
 * @param {number|null|undefined} value
 * @param {number} [maxDecimals=2]
 * @returns {string}
 */
export function formatNum(value, maxDecimals = 2) {
  if (value == null || isNaN(Number(value))) return '—'
  return parseFloat(Number(value).toFixed(maxDecimals)).toString()
}
