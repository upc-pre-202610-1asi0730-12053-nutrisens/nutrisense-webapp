/**
 * @typedef {Object} PantryItemProps
 * @property {string} id
 * @property {string} userId
 * @property {string} ingredientId
 * @property {number} quantity
 * @property {'g' | 'kg' | 'ml' | 'l' | 'unit'} unit
 * @property {string} addedAt
 */

/** @param {PantryItemProps} props */
export function PantryItem(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    ingredientId: props.ingredientId,
    quantity: props.quantity,
    unit: props.unit,
    addedAt: props.addedAt,

    /** @returns {number} quantity expressed in base unit (g or ml) */
    normalizedQuantity() {
      if (props.unit === 'kg') return props.quantity * 1000
      if (props.unit === 'l') return props.quantity * 1000
      return props.quantity
    },
    /** @returns {'g' | 'ml' | 'unit'} base unit after normalization */
    normalizedUnit() {
      if (props.unit === 'kg') return 'g'
      if (props.unit === 'l') return 'ml'
      return props.unit
    },
    /** @returns {boolean} */
    isEmpty() { return props.quantity <= 0 },
  })
}
