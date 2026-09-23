import Stripe from 'stripe'
import {STRIPE_SECRET_KEY} from 'astro:env/server'

/** Client Stripe. Il pacchetto ha un entry `workerd`: usa fetch e Web Crypto, niente Node. */
export function getStripe() {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configurata')
  return new Stripe(STRIPE_SECRET_KEY, {
    appInfo: {name: 'Frenz Jewelz', url: 'https://frenzjewelz.it'},
  })
}
