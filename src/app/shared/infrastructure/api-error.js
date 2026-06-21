/**
 * Returns the backend-provided error message (the `{ message }` body of an
 * HTTP error response), or null when the error has no usable message — e.g.
 * a network failure, a thrown assembler, or a non-API error (Stripe, etc.).
 *
 * Callers supply their own localized fallback, so the previous behaviour is
 * preserved whenever the backend doesn't provide a message:
 *
 *   summary: backendMessage(err) ?? t('common.error')
 *
 * The message is rendered as-is by the backend (already localized via the
 * Accept-Language header). Always render it through text interpolation or a
 * toast `summary` (auto-escaped) — never v-html.
 *
 * @param {unknown} error
 * @returns {string|null}
 */
export function backendMessage(error) {
  const msg = error?.response?.data?.message
  return typeof msg === 'string' && msg.trim() ? msg : null
}
