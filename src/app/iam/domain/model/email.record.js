const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {string} raw
 * @throws {Error} if not a valid email format
 * @returns {{ value: string, equals(other: ReturnType<typeof Email>): boolean, toString(): string }}
 */
export function Email(raw) {
  if (!EMAIL_REGEX.test(raw)) throw new Error(`Invalid email: ${raw}`)
  const normalized = raw.toLowerCase().trim()
  return Object.freeze({
    value: normalized,
    /** @param {ReturnType<typeof Email>} other @returns {boolean} */
    equals(other) { return normalized === other.value },
    toString() { return normalized },
  })
}
