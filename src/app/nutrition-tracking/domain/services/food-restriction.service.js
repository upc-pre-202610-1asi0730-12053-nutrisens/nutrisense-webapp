// PATH: src/app/nutrition-tracking/domain/services/food-restriction.service.js
import { CONFLICT_TAGS } from '../../../iam/domain/model/dietary-restriction.entity.js'

/**
 * Food tags forbidden by medical conditions that influence diet
 * but are not modelled as DietaryRestriction values.
 * @type {Record<string, string[]>}
 */
const MEDICAL_CONDITION_TAGS = {
  'coeliac-disease': ['gluten'],
  'gout':            ['seafood', 'fish'],
}

/** @type {Record<string, string[]>} */
const ALL_RESTRICTION_TAGS = { ...CONFLICT_TAGS, ...MEDICAL_CONDITION_TAGS }

/**
 * Returns the restriction/condition keys that conflict with a food's tags.
 * @param {ReturnType<import('../model/food.entity.js').Food>} food
 * @param {string[]} restrictions - dietary restriction values (e.g. 'gluten-free')
 * @param {string[]} conditions   - medical condition values (e.g. 'coeliac-disease')
 * @returns {string[]} keys from restrictions/conditions that conflict with the food
 */
export function conflictingFlags(food, restrictions, conditions) {
  return [...restrictions, ...conditions].filter(r => {
    const tags = ALL_RESTRICTION_TAGS[r] ?? []
    return tags.some(tag => food.hasRestriction(tag))
  })
}
