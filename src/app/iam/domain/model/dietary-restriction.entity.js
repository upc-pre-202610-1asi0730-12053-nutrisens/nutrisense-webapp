/**
 * @typedef {'lactose-free' | 'gluten-free' | 'vegan' | 'vegetarian' | 'nut-free' | 'seafood-free' | 'halal' | 'kosher' | 'none'} RestrictionValue
 */

export const RESTRICTION_VALUES = /** @type {RestrictionValue[]} */ ([
  'lactose-free', 'gluten-free', 'vegan', 'vegetarian',
  'nut-free', 'seafood-free', 'halal', 'kosher', 'none',
])

/** @type {Record<string, string[]>} Canonical map of restriction keys to forbidden food tags. */
export const CONFLICT_TAGS = {
  'lactose-free': ['lactose'],
  'gluten-free': ['gluten'],
  'vegan': ['meat', 'fish', 'dairy', 'egg'],
  'vegetarian': ['meat', 'fish'],
  'nut-free': ['nuts'],
  'seafood-free': ['seafood', 'fish'],
  'halal': ['pork', 'alcohol'],
  'kosher': ['pork', 'shellfish'],
  'none': [],
}

/**
 * @typedef {Object} DietaryRestrictionProps
 * @property {string} id
 * @property {string} userId
 * @property {RestrictionValue} restriction
 */

/** @param {DietaryRestrictionProps} props */
export function DietaryRestriction(props) {
  if (!RESTRICTION_VALUES.includes(props.restriction)) {
    throw new Error(`Invalid restriction: ${props.restriction}`)
  }
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    restriction: props.restriction,
    /**
     * @param {string[]} foodTags - restriction tags on a food item
     * @returns {boolean}
     */
    conflictsWith(foodTags) {
      const forbidden = CONFLICT_TAGS[props.restriction] ?? []
      return forbidden.some(tag => foodTags.includes(tag))
    },
    /** @returns {boolean} */
    isNone() { return props.restriction === 'none' },
  })
}
