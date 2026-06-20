// PATH: src/app/subscriptions-billing/presentation/feature-i18n.js

/**
 * Maps a canonical plan feature key (as stored in the backend / domain
 * `plan-feature.record.js`) to its i18n label key. Shared across plan-selection,
 * plan-card and checkout so feature labels stay consistent and never render
 * raw keys (e.g. "smart-scan-dish").
 *
 * The two `everything-in-*` entries are synthetic: they are not stored in the
 * DB, they are injected by the marketing cards to summarise inherited tiers.
 * @type {Record<string, string>}
 */
export const FEATURE_I18N = {
  'nutrition-log-manual':    'subscription.featureNutritionLog',
  'dashboard':               'subscription.featureBasicDashboard',
  'bmi-bmr-tdee':            'subscription.featureBmiCalculator',
  'history-30d':             'subscription.featureHistory30d',
  'history-90d':             'subscription.featureHistory90d',
  'history-unlimited':       'subscription.featureUnlimitedHistory',
  'smart-scan-dish':         'subscription.featureSmartScan',
  'smart-scan-menu':         'subscription.featureMenuScan',
  'travel-mode':             'subscription.featureTravelMode',
  'weather-recommendations': 'subscription.featureWeatherRecs',
  'pantry-recipes':          'subscription.featurePantry',
  'wearable-sync':           'subscription.featureGoogleFit',
  'pdf-reports':             'subscription.featurePdfReports',
  // Synthetic summary lines for the marketing cards
  'everything-in-basic':     'subscription.featureEverythingBasic',
  'everything-in-pro':       'subscription.featureEverythingPro',
}

/**
 * Feature keys stored in the DB for gating purposes but intentionally hidden
 * from the marketing plan cards (kept off the canonical pricing presentation).
 * @type {Set<string>}
 */
export const HIDDEN_PLAN_FEATURES = new Set(['history-30d', 'history-90d'])

/**
 * Resolves a feature key to a translated label, falling back to the raw key
 * when the backend sends a feature that isn't mapped yet.
 * @param {(key: string) => string} t - vue-i18n translate function
 * @param {string} featureKey
 * @returns {string}
 */
export function featureLabel(t, featureKey) {
  return t(FEATURE_I18N[featureKey] ?? featureKey)
}
