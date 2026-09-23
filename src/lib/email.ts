import {ORDER_NOTIFICATION_EMAIL, RESEND_API_KEY} from 'astro:env/server'
import {formatPrice} from './money'

// Il dominio va verificato su Resend (DNS) prima di usare questo mittente.
const FROM = 'Frenz Jewelz <ordini@frenzjewelz.it>'

interface EmailOrder {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: {title: string; quantity: number; unitPrice: number}[]
  shippingCost: number
  total: number
  shippingAddress?: {name?: string; line1?: string; line2?: string; postalCode?: string; city?: string; state?: string; country?: string}
  stockIssue: boolean
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY assente: email non inviata', {to, subject})
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: FROM, to: [to], subject, html, reply_to: replyTo}),
  })
  if (!res.ok) console.error('Resend', res.status, await res.text())
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]!)

function itemsTable(o: EmailOrder) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${i.quantity} × ${esc(i.title)}</td><td align="right">${formatPrice(i.unitPrice * i.quantity)}</td></tr>`)
    .join('')
  return `<table width="100%" style="border-collapse:collapse;font-size:15px">${rows}
    <tr><td style="padding:6px 0;border-top:1px solid #ddd">Spedizione</td><td align="right" style="border-top:1px solid #ddd">${formatPrice(o.shippingCost)}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold">Totale</td><td align="right" style="font-weight:bold">${formatPrice(o.total)}</td></tr></table>`
}

function address(a?: EmailOrder['shippingAddress']) {
  if (!a) return ''
  return [a.name, a.line1, a.line2, `${a.postalCode ?? ''} ${a.city ?? ''} ${a.state ? `(${a.state})` : ''}`.trim(), a.country]
    .filter(Boolean)
    .map((l) => esc(String(l)))
    .join('<br>')
}

const wrap = (body: string) =>
  `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5">${body}
  <p style="font-size:12px;color:#888;margin-top:32px">Frenz Jewelz · Ancona · gioielli in argento 925 fatti a mano</p></div>`

export async function sendOrderConfirmation(o: EmailOrder) {
  const html = wrap(`
    <h1 style="font-size:22px">Grazie ${esc(o.customerName.split(' ')[0] ?? '')}, ordine ricevuto</h1>
    <p>Il tuo ordine <strong>${esc(o.orderNumber)}</strong> è confermato. Ti scriviamo appena parte con il numero di tracking.</p>
    ${itemsTable(o)}
    <h2 style="font-size:15px;margin-top:24px">Spedizione a</h2><p>${address(o.shippingAddress)}</p>
    <p>Per qualsiasi cosa rispondi a questa email.</p>`)
  await send(o.customerEmail, `Ordine ${o.orderNumber} confermato`, html, ORDER_NOTIFICATION_EMAIL)
}

export async function sendOrderNotification(o: EmailOrder) {
  if (!ORDER_NOTIFICATION_EMAIL) return
  const warning = o.stockIssue
    ? `<p style="padding:12px;background:#fff3cd;border:1px solid #f0c36d"><strong>Attenzione:</strong> un pezzo risultava già esaurito al momento del pagamento. Ordine segnato <em>da verificare</em>: controlla in Studio ed eventualmente rimborsa da Stripe.</p>`
    : ''
  const html = wrap(`
    <h1 style="font-size:22px">Nuovo ordine ${esc(o.orderNumber)}</h1>
    ${warning}
    <p><strong>${esc(o.customerName)}</strong> · ${esc(o.customerEmail)}</p>
    ${itemsTable(o)}
    <h2 style="font-size:15px;margin-top:24px">Spedire a</h2><p>${address(o.shippingAddress)}</p>
    <p>Gestisci stato e tracking nello Studio Sanity, sezione Ordini.</p>`)
  await send(ORDER_NOTIFICATION_EMAIL, `${o.stockIssue ? '[DA VERIFICARE] ' : ''}Nuovo ordine ${o.orderNumber} · ${formatPrice(o.total)}`, html, o.customerEmail)
}
