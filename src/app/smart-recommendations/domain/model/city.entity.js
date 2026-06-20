/**
 * @typedef {Object} CityProps
 * @property {number} id
 * @property {string} key
 * @property {string} nameEn
 * @property {string} nameEs
 * @property {string} country
 * @property {number} lat
 * @property {number} lng
 * @property {string} timezone
 */

/** @param {CityProps} props */
export function City(props) {
  return Object.freeze({
    id: props.id,
    key: props.key,
    nameEn: props.nameEn,
    nameEs: props.nameEs,
    country: props.country,
    lat: props.lat,
    lng: props.lng,
    timezone: props.timezone,
  })
}
