/**
 * @typedef {Object} PaymentRecordProps
 * @property {string} id
 * @property {string} userId
 * @property {string} planId
 * @property {number} amountUsd
 * @property {'paid' | 'failed' | 'refunded' | 'pending'} status
 * @property {string|null} paidAt
 */

/** @param {PaymentRecordProps} props */
export function PaymentRecord(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    planId: props.planId,
    amountUsd: props.amountUsd,
    status: props.status,
    paidAt: props.paidAt,

    /** @returns {boolean} */
    isPaid() { return props.status === 'paid' },
    /** @returns {boolean} */
    isFailed() { return props.status === 'failed' },
    /** @returns {boolean} */
    isRefunded() { return props.status === 'refunded' },
    /** @returns {boolean} */
    isPending() { return props.status === 'pending' },
    /** @returns {string} e.g. "$14.99" */
    formattedAmount() { return `$${props.amountUsd.toFixed(2)}` },
  })
}
