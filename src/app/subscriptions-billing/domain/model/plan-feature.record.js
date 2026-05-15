/**
 * @typedef {'nutrition-log-manual'|'dashboard'|'bmi-bmr-tdee'|'history-30d'|'history-90d'|'history-unlimited'|'smart-scan-dish'|'smart-scan-menu'|'travel-mode'|'weather-recommendations'|'pantry-recipes'|'wearable-sync'|'pdf-reports'} PlanFeatureValue
 */

export const NUTRITION_LOG_MANUAL = /** @type {PlanFeatureValue} */ ('nutrition-log-manual')
export const DASHBOARD = /** @type {PlanFeatureValue} */ ('dashboard')
export const BMI_BMR_TDEE = /** @type {PlanFeatureValue} */ ('bmi-bmr-tdee')
export const HISTORY_30D = /** @type {PlanFeatureValue} */ ('history-30d')
export const HISTORY_90D = /** @type {PlanFeatureValue} */ ('history-90d')
export const HISTORY_UNLIMITED = /** @type {PlanFeatureValue} */ ('history-unlimited')
export const SMART_SCAN_DISH = /** @type {PlanFeatureValue} */ ('smart-scan-dish')
export const SMART_SCAN_MENU = /** @type {PlanFeatureValue} */ ('smart-scan-menu')
export const TRAVEL_MODE = /** @type {PlanFeatureValue} */ ('travel-mode')
export const WEATHER_RECOMMENDATIONS = /** @type {PlanFeatureValue} */ ('weather-recommendations')
export const PANTRY_RECIPES = /** @type {PlanFeatureValue} */ ('pantry-recipes')
export const WEARABLE_SYNC = /** @type {PlanFeatureValue} */ ('wearable-sync')
export const PDF_REPORTS = /** @type {PlanFeatureValue} */ ('pdf-reports')

export const ALL_FEATURES = Object.freeze(/** @type {PlanFeatureValue[]} */ ([
  NUTRITION_LOG_MANUAL, DASHBOARD, BMI_BMR_TDEE,
  HISTORY_30D, HISTORY_90D, HISTORY_UNLIMITED,
  SMART_SCAN_DISH, SMART_SCAN_MENU, TRAVEL_MODE,
  WEATHER_RECOMMENDATIONS, PANTRY_RECIPES, WEARABLE_SYNC, PDF_REPORTS,
]))
