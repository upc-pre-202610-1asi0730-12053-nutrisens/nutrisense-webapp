/**
 * @typedef {Object} LocationPreferenceProps
 * @property {string} id
 * @property {string} userId
 * @property {string} homeCityId
 * @property {string} currentCityId
 * @property {boolean} travelModeActive
 * @property {boolean} isManualOverride
 * @property {boolean} locationPermissionGranted
 * @property {string} updatedAt
 */

/** @param {LocationPreferenceProps} props */
export function LocationPreference(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    homeCityId: props.homeCityId,
    currentCityId: props.currentCityId,
    travelModeActive: props.travelModeActive,
    isManualOverride: props.isManualOverride,
    locationPermissionGranted: props.locationPermissionGranted,
    updatedAt: props.updatedAt,

    /**
     * The city used to filter recommendations — current city when traveling, home otherwise.
     * @returns {string}
     */
    effectiveCityId() {
      return props.travelModeActive ? props.currentCityId : props.homeCityId
    },
    /** @returns {boolean} travel mode active and away from home city */
    isTraveling() {
      return props.travelModeActive && props.currentCityId !== props.homeCityId
    },
    /** @returns {boolean} */
    hasLocationPermission() { return props.locationPermissionGranted },
  })
}
