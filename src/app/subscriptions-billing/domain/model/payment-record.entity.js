/**
 * @typedef {Object} PaymentRecordProps
 * @property {number} id
 * @property {number} userSubscriptionId
 * @property {number} amount
 * @property {string} [currency]
 * @property {'paid' | 'failed' | 'refunded' | 'pending'} status
 * @property {string|null} processedAt
 * @property {string|null} [stripePaymentIntentId]
 */

/** @param {PaymentRecordProps} props */
export function PaymentRecord(props) {
  return Object.freeze({
    id: props.id,
    userSubscriptionId: props.userSubscriptionId,
    amount: props.amount,
    amountUsd: props.amount,   // alias kept for view compatibility
    currency: props.currency ?? 'USD',
    status: props.status,
    processedAt: props.processedAt ?? null,
    paidAt: props.processedAt ?? null,   // alias kept for view compatibility
    stripePaymentIntentId: props.stripePaymentIntentId ?? null,
    type: 'payment',           // backend does not differentiate; always 'payment'

    /** @returns {boolean} */
    isPaid() { return props.status === 'paid' },
    /** @returns {boolean} */
    isFailed() { return props.status === 'failed' },
    /** @returns {boolean} */
    isRefunded() { return props.status === 'refunded' },
    /** @returns {boolean} */
    isPending() { return props.status === 'pending' },
    /** @returns {string} */
    formattedAmount() { return `$${props.amount.toFixed(2)}` },
    /** @returns {boolean} backend does not track plan changes in payment records */
    isPlanChange() { return false },
  })
}
