import type {APIRoute} from 'astro'
import {PUBLIC_SITE_URL} from 'astro:env/client'
import {getStripe} from '../../lib/stripe'
import {getSanityFresh} from '../../lib/sanity-write'
import {urlFor} from '../../lib/sanity'
import {getAvailability, isPurchasable, maxQuantity} from '../../lib/availability'
import type {ProductCard} from '../../lib/types'

export const prerender = false

// Domanda aperta 1 del brief: per ora solo Italia.
const ALLOWED_COUNTRIES: ['IT'] = ['IT']
const SESSION_MINUTES = 30 // minimo Stripe: non blocca i pezzi unici a lungo

interface CartLine {
  id: string
  quantity: number
}

interface ShippingOption {
  _key: string
  label: string
  price: number
  minDays: number
  maxDays: number
}

interface CheckoutSettings {
  shippingOptions?: ShippingOption[]
  freeShippingThreshold?: number
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}})

export const POST: APIRoute = async ({request}) => {
  let lines: CartLine[]
  try {
    const body = (await request.json()) as {items?: unknown}
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) throw new Error()
    lines = body.items.map((i: {id?: unknown; quantity?: unknown}) => {
      if (typeof i.id !== 'string' || typeof i.quantity !== 'number' || !Number.isInteger(i.quantity) || i.quantity < 1) throw new Error()
      return {id: i.id, quantity: i.quantity}
    })
  } catch {
    return json({error: 'Carrello non valido.'}, 400)
  }

  // Prezzi e disponibilità SOLO da Sanity, mai dal client. Lettura senza CDN.
  const sanity = getSanityFresh()
  const ids = [...new Set(lines.map((l) => l.id))]
  const [products, settings] = await Promise.all([
    sanity.fetch<(ProductCard & {image?: {asset: {_ref: string}}})[]>(
      `*[_type == "product" && _id in $ids]{_id, title, "slug": slug.current, price, "image": images[0], productionType, stock, isAvailable}`,
      {ids},
    ),
    sanity.fetch<CheckoutSettings | null>(`*[_id == "siteSettings"][0]{shippingOptions[]{_key, label, price, minDays, maxDays}, freeShippingThreshold}`),
  ])

  const unavailable: string[] = []
  const lineItems = []
  let subtotal = 0

  for (const line of lines) {
    const p = products.find((x) => x._id === line.id)
    if (!p || !isPurchasable(getAvailability(p))) {
      unavailable.push(line.id)
      continue
    }
    const quantity = Math.min(line.quantity, maxQuantity(p))
    if (quantity < 1) {
      unavailable.push(line.id)
      continue
    }
    subtotal += p.price * quantity
    lineItems.push({
      quantity,
      price_data: {
        currency: 'eur',
        unit_amount: p.price,
        product_data: {
          name: p.title,
          images: p.image ? [urlFor(p.image).width(600).height(750).format('jpg').url()] : [],
          metadata: {sanityId: p._id},
        },
      },
    })
  }

  if (unavailable.length > 0) {
    const names = unavailable.map((id) => products.find((p) => p._id === id)?.title ?? 'un prodotto').join(', ')
    return json({error: `Non più disponibile: ${names}. Lo abbiamo tolto dal carrello.`, unavailable}, 409)
  }

  const options = settings?.shippingOptions ?? []
  if (options.length === 0) return json({error: 'Spedizione non configurata. Scrivici e ti aiutiamo.'}, 500)
  const freeShipping = typeof settings?.freeShippingThreshold === 'number' && subtotal >= settings.freeShippingThreshold

  const shippingOptions = options.map((o) => ({
    shipping_rate_data: {
      type: 'fixed_amount' as const,
      display_name: freeShipping ? `${o.label} (gratuita)` : o.label,
      fixed_amount: {amount: freeShipping ? 0 : o.price, currency: 'eur'},
      delivery_estimate: {
        minimum: {unit: 'business_day' as const, value: o.minDays},
        maximum: {unit: 'business_day' as const, value: o.maxDays},
      },
    },
  }))

  const site = PUBLIC_SITE_URL ?? new URL(request.url).origin

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      locale: 'it',
      line_items: lineItems,
      shipping_address_collection: {allowed_countries: ALLOWED_COUNTRIES},
      shipping_options: shippingOptions,
      phone_number_collection: {enabled: true},
      // Richiede l'URL dei termini impostato su Stripe: Impostazioni > Dettagli pubblici.
      consent_collection: {terms_of_service: 'required'},
      custom_text: {
        terms_of_service_acceptance: {message: `Accetto i [termini e condizioni](${site}/termini) di Frenz Jewelz.`},
      },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
      success_url: `${site}/ordine/grazie?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/ordine/annullato`,
      metadata: {
        // Il webhook legge da qui cosa scalare: id Sanity e quantità.
        items: JSON.stringify(lineItems.map((li) => ({id: li.price_data.product_data.metadata.sanityId, quantity: li.quantity}))),
      },
    })
    return json({url: session.url})
  } catch (err) {
    console.error('Stripe checkout', err)
    return json({error: 'Impossibile avviare il pagamento. Riprova tra poco.'}, 502)
  }
}
