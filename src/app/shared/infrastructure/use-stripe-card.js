import { ref, onUnmounted } from 'vue'
import { getStripe } from './stripe.js'

/**
 * @typedef {Object} CardMeta
 * @property {string} lastFour
 * @property {string} brand
 * @property {number} expiryMonth
 * @property {number} expiryYear
 * @property {string} cardholderName
 */

/**
 * @typedef {Object} StripeCardResult
 * @property {string} stripePaymentMethodId
 * @property {CardMeta} cardMeta
 */

/**
 * Composable that manages a Stripe CardElement lifecycle.
 * Call mount(domElement) to attach the element; call destroy() or let
 * onUnmounted do it automatically.
 *
 * @returns {{
 *   mount: (el: HTMLElement) => Promise<void>,
 *   createPaymentMethod: (cardholderName: string) => Promise<StripeCardResult>,
 *   destroy: () => void,
 *   stripeError: import('vue').Ref<string>,
 *   stripeLoading: import('vue').Ref<boolean>,
 * }}
 */
export function useStripeCard() {
  /** @type {import('vue').Ref<string>} */
  const stripeError = ref('')
  /** @type {import('vue').Ref<boolean>} */
  const stripeLoading = ref(false)

  /** @type {import('@stripe/stripe-js').Stripe | null} */
  let stripe = null
  /** @type {import('@stripe/stripe-js').StripeElements | null} */
  let elements = null
  /** @type {import('@stripe/stripe-js').StripeCardElement | null} */
  let cardElement = null

  /**
   * Mounts the Stripe CardElement to the given DOM element.
   * @param {HTMLElement} el
   */
  async function mount(el) {
    stripe = await getStripe()
    elements = stripe.elements()
    cardElement = elements.create('card', {
      style: {
        base: {
          fontFamily: 'Poppins, Inter, sans-serif',
          fontSize: '15px',
          color: '#1a1a1a',
          '::placeholder': { color: '#9ca3af' },
        },
        invalid: { color: '#ef4444' },
      },
    })
    cardElement.mount(el)
    cardElement.on('change', (e) => {
      stripeError.value = e.error?.message ?? ''
    })
  }

  /**
   * Tokenizes the mounted card and returns the PaymentMethod id + card metadata.
   * Throws (and sets stripeError) if Stripe declines or returns an error.
   * @param {string} cardholderName
   * @returns {Promise<StripeCardResult>}
   */
  async function createPaymentMethod(cardholderName) {
    if (!stripe || !cardElement) throw new Error('Stripe CardElement is not mounted')
    stripeLoading.value = true
    stripeError.value = ''
    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: cardholderName },
      })
      if (error) {
        stripeError.value = error.message ?? 'Card error'
        throw error
      }
      return {
        stripePaymentMethodId: paymentMethod.id,
        cardMeta: {
          lastFour:    paymentMethod.card.last4,
          brand:       paymentMethod.card.brand,
          expiryMonth: paymentMethod.card.exp_month,
          expiryYear:  paymentMethod.card.exp_year,
          cardholderName,
        },
      }
    } finally {
      stripeLoading.value = false
    }
  }

  function destroy() {
    cardElement?.destroy()
    cardElement = null
    elements = null
  }

  onUnmounted(destroy)

  return { mount, createPaymentMethod, destroy, stripeError, stripeLoading }
}
