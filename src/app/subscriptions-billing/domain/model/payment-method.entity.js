// PATH: src/app/subscriptions-billing/domain/model/payment-method.entity.js

/** @typedef {'visa' | 'mastercard' | 'amex' | 'other'} CardBrand */

/**
 * @typedef {Object} PaymentMethodProps
 * @property {string} id
 * @property {string} userId
 * @property {string} lastFour
 * @property {CardBrand} brand
 * @property {number} expiryMonth
 * @property {number} expiryYear
 * @property {string} cardholderName
 * @property {string} createdAt
 */

/** @param {PaymentMethodProps} props */
export function PaymentMethod(props) {
  return Object.freeze({
    id:              props.id,
    userId:          props.userId,
    lastFour:        props.lastFour,
    brand:           props.brand,
    expiryMonth:     props.expiryMonth,
    expiryYear:      props.expiryYear,
    cardholderName:  props.cardholderName,
    createdAt:       props.createdAt,

    /** @returns {string} e.g. "**** **** **** 4242" */
    maskedNumber() {
      return `**** **** **** ${props.lastFour}`
    },
    /** @returns {string} e.g. "05/27" */
    expiryLabel() {
      return `${String(props.expiryMonth).padStart(2, '0')}/${String(props.expiryYear).slice(-2)}`
    },
  })
}

/**
 * Detects card brand from the card number prefix.
 * @param {string} cardNumber - raw digits only
 * @returns {CardBrand}
 */
PaymentMethod.detectBrand = function (cardNumber) {
  const digits = cardNumber.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  return 'other'
}
