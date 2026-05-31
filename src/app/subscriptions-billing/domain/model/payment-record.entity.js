/**
 * @typedef {'payment' | 'upgrade' | 'downgrade'} PaymentRecordType
 *
 * @typedef {Object} PaymentRecordProps
 * @property {string} id
 * @property {string} userId
 * @property {string} planId
 * @property {string|null} [fromPlanId] - Previous plan ID for upgrade/downgrade records.
 * @property {number} amountUsd
 * @property {'paid' | 'failed' | 'refunded' | 'pending'} status
 * @property {PaymentRecordType} [type] - Defaults to 'payment' for backward compatibility.
 * @property {string|null} paidAt
 */

/** @param {PaymentRecordProps} props */
export function PaymentRecord(props) {
  return Object.freeze({
    id: props.id,
    userId: props.userId,
    planId: props.planId,
    fromPlanId: props.fromPlanId ?? null,
    amountUsd: props.amountUsd,
    status: props.status,
    type: props.type ?? 'payment',
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
    /** @returns {boolean} */
    isPlanChange() { return props.type === 'upgrade' || props.type === 'downgrade' },
  })
}
