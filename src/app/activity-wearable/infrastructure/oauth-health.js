// PATH: src/app/activity-wearable/infrastructure/oauth-health.js
// Browser-side helper for the Google Health OAuth2 authorization-code flow.
// Uses a same-tab full-page redirect (popups are unreliable here because Google's
// consent screen sends Cross-Origin-Opener-Policy: same-origin, which severs the
// opener↔popup link). The CSRF state is kept in sessionStorage, which survives the
// round-trip since we stay in the same tab.

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/health'
const STORAGE_STATE_KEY = 'ns_health_oauth_state'

/** @returns {string} The redirect URI Google will call back, defaulting to this origin. */
export function redirectUri() {
  return import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT_URI
    ?? `${window.location.origin}/oauth/health/callback`
}

/**
 * Builds the Google authorization URL.
 * @param {string} state - opaque CSRF token echoed back by Google.
 * @returns {string}
 */
function buildAuthUrl(state) {
  const clientId = import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID ?? ''
  const scope = import.meta.env.VITE_GOOGLE_HEALTH_SCOPE ?? DEFAULT_SCOPE
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

/** @returns {boolean} Whether a client id is configured. */
export function isHealthOAuthConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_HEALTH_CLIENT_ID)
}

/**
 * Begins the OAuth flow by redirecting the current tab to Google's consent screen.
 * Control returns to the app via the `/oauth/health/callback` route.
 */
export function startHealthOAuth() {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STORAGE_STATE_KEY, state)
  window.location.href = buildAuthUrl(state)
}

/**
 * Validates and consumes the CSRF state returned by Google on the callback.
 * @param {string|null} returnedState
 * @returns {boolean} true when the state matches the one we issued.
 */
export function consumeOAuthState(returnedState) {
  const expected = sessionStorage.getItem(STORAGE_STATE_KEY)
  sessionStorage.removeItem(STORAGE_STATE_KEY)
  return Boolean(expected) && expected === returnedState
}
