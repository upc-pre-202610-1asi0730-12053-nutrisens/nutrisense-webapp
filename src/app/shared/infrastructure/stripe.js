import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

/**
 * Returns the Stripe.js instance, loading it once.
 * Requires VITE_STRIPE_PUBLISHABLE_KEY to be set.
 * @returns {Promise<import('@stripe/stripe-js').Stripe>}
 */
export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!key) throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not defined')
    stripePromise = loadStripe(key)
  }
  return stripePromise
}
