import type {APIRoute} from 'astro'
import type Stripe from 'stripe'
import {STRIPE_WEBHOOK_SECRET} from 'astro:env/server'
import {getStripe} from '../../lib/stripe'
import {getSanityWriter} from '../../lib/sanity-write'
import {sendOrderConfirmation, sendOrderNotification} from '../../lib/email'

export const prerender = false

interface StockRow {
  _id: string
  title: string
  price: number
  stock?: number
  productionType: string
}

/** Numero ordine leggibile: FJ-AAMMGG-XXXX (ultimi 4 caratteri della sessione Stripe). */
const orderNumberFor = (session: Stripe.Checkout.Session) => {
  const d = new Date(session.created * 1000)
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '')
  return `FJ-${ymd}-${session.id.slice(-4).toUpperCase()}`
}

export const POST: APIRoute = async ({request}) => {
  if (!STRIPE_WEBHOOK_SECRET) return new Response('Webhook non configurato', {status: 500})

  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Firma mancante', {status: 400})

  let event: Stripe.Event
  try {
    // Il body va letto grezzo: qualsiasi parsing rompe la firma.
    event = await getStripe().webhooks.constructEventAsync(await request.text(), signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Firma webhook non valida', err)
    return new Response('Firma non valida', {status: 400})
  }

  if (event.type !== 'checkout.session.completed') return new Response('ignored', {status: 200})

  const session = event.data.object
  if (session.payment_status !== 'paid') return new Response('non pagato', {status: 200})

  const sanity = getSanityWriter()
  const orderId = `order-${session.id}`

  // Idempotenza: Stripe ritenta, noi no. Un solo ordine per sessione.
  if (await sanity.fetch<boolean>(`defined(*[_id == $id][0]._id)`, {id: orderId})) {
    return new Response('già registrato', {status: 200})
  }

  const requested = JSON.parse(session.metadata?.items ?? '[]') as {id: string; quantity: number}[]
  const rows = await sanity.fetch<StockRow[]>(
    `*[_type == "product" && _id in $ids]{_id, title, price, stock, productionType}`,
    {ids: requested.map((r) => r.id)},
  )

  // Scala lo stock; se un pezzo era già finito, l'ordine va verificato a mano (rimborso).
  let stockIssue = false
  const tx = sanity.transaction()
  const items = requested.map((r) => {
    const p = rows.find((x) => x._id === r.id)
    if (!p) {
      stockIssue = true
      return {_key: r.id, _type: 'orderItem', title: 'Prodotto rimosso', quantity: r.quantity, unitPrice: 0}
    }
    if (p.productionType !== 'suOrdinazione') {
      const available = p.stock ?? 0
      if (available < r.quantity) stockIssue = true
      tx.patch(p._id, (patch) => patch.set({stock: Math.max(0, available - r.quantity)}))
    }
    return {
      _key: r.id,
      _type: 'orderItem',
      productRef: {_type: 'reference', _ref: p._id, _weak: true},
      title: p.title,
      quantity: r.quantity,
      unitPrice: p.price,
    }
  })

  const shipping = session.collected_information?.shipping_details
  const address = shipping?.address
  const order = {
    _id: orderId,
    _type: 'order',
    orderNumber: orderNumberFor(session),
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    status: stockIssue ? 'daVerificare' : 'pagato',
    items,
    shippingCost: session.shipping_cost?.amount_total ?? 0,
    total: session.amount_total ?? 0,
    customerName: session.customer_details?.name ?? shipping?.name ?? '',
    customerEmail: session.customer_details?.email ?? '',
    customerPhone: session.customer_details?.phone ?? undefined,
    shippingAddress: address
      ? {
          name: shipping?.name ?? undefined,
          line1: address.line1 ?? undefined,
          line2: address.line2 ?? undefined,
          postalCode: address.postal_code ?? undefined,
          city: address.city ?? undefined,
          state: address.state ?? undefined,
          country: address.country ?? undefined,
        }
      : undefined,
    createdAt: new Date(session.created * 1000).toISOString(),
  }

  try {
    // `create` (non createIfNotExists): se l'ordine esiste già la transazione fallisce
    // per intero e lo stock non viene scalato due volte.
    await tx.create(order).commit()
  } catch (err) {
    if (String(err).includes('already exists')) return new Response('già registrato', {status: 200})
    console.error('Sanity ordine', err)
    return new Response('Errore salvataggio ordine', {status: 500})
  }

  const emailData = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    items: items.map(({title, quantity, unitPrice}) => ({title, quantity, unitPrice})),
    shippingCost: order.shippingCost,
    total: order.total,
    shippingAddress: order.shippingAddress,
    stockIssue,
  }
  // Le email non devono far fallire il webhook: l'ordine è già salvato.
  await Promise.allSettled([
    order.customerEmail ? sendOrderConfirmation(emailData) : Promise.resolve(),
    sendOrderNotification(emailData),
  ])

  return new Response('ok', {status: 200})
}
