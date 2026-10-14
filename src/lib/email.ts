import {GMAIL_APP_PASSWORD, GMAIL_USER, ORDER_NOTIFICATION_EMAIL, RESEND_API_KEY} from 'astro:env/server'
import {formatPrice} from './money'
import {BUDGET_RANGES, PIECE_TYPES, type CustomRequestInput} from './custom-request'

const FROM_NAME = 'Frenz Jewelz'
// Solo per Resend: il dominio va verificato su Resend (DNS) prima di usare questo mittente.
const RESEND_FROM = `${FROM_NAME} <ordini@frenzjewelz.it>`

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

// ORDER_NOTIFICATION_EMAIL può contenere più indirizzi separati da virgola.
const notifyList = () => (ORDER_NOTIFICATION_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean)
const replyToFrenz = () => notifyList()[0]

/**
 * Invio email. Canale principale: il Gmail di FRENZ via SMTP (GMAIL_USER + password per app),
 * nessun provider esterno. In alternativa Resend, se configurato. Senza nessuno dei due: solo log.
 */
async function send(to: string | string[], subject: string, html: string, replyTo?: string) {
  const recipients = Array.isArray(to) ? to : [to]
  try {
    if (GMAIL_USER && GMAIL_APP_PASSWORD) return await sendGmail(recipients, subject, html, replyTo)
    if (RESEND_API_KEY) return await sendResend(recipients, subject, html, replyTo)
    console.warn('Nessun canale email configurato: email non inviata', {to, subject})
  } catch (err) {
    // Le email non bloccano mai ordine o richiesta (già salvati): si logga e si va avanti.
    console.error('Email non inviata', {subject, to: recipients}, err)
  }
}

async function sendGmail(to: string[], subject: string, html: string, replyTo?: string) {
  // Import dinamico: `cloudflare:sockets` esiste solo nel runtime Workers (anche in `astro dev`).
  const {WorkerMailer} = await import('worker-mailer')
  const mailer = await WorkerMailer.connect({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    credentials: {username: GMAIL_USER!, password: GMAIL_APP_PASSWORD!.replace(/\s/g, '')},
    authType: 'plain',
  })
  try {
    await mailer.send({
      from: {name: FROM_NAME, email: GMAIL_USER!},
      to: to.map((email) => ({email})),
      reply: replyTo ? {email: replyTo} : undefined,
      subject,
      html,
      text: htmlToText(html),
    })
  } finally {
    await mailer.close().catch(() => {})
  }
}

async function sendResend(to: string[], subject: string, html: string, replyTo?: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: RESEND_FROM, to, subject, html, reply_to: replyTo}),
  })
  if (!res.ok) console.error('Resend', res.status, await res.text())
}

/** Versione testo semplice: alcuni client e filtri antispam la vogliono accanto all'HTML. */
const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|tr|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

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
  await send(o.customerEmail, `Ordine ${o.orderNumber} confermato`, html, replyToFrenz())
}

export async function sendOrderNotification(o: EmailOrder) {
  if (notifyList().length === 0) return
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
  await send(notifyList(), `${o.stockIssue ? '[DA VERIFICARE] ' : ''}Nuovo ordine ${o.orderNumber} · ${formatPrice(o.total)}`, html, o.customerEmail)
}

// --- Richieste su misura ---------------------------------------------------

const label = <T extends readonly {value: string; label: string}[]>(list: T, value?: string) =>
  list.find((i) => i.value === value)?.label ?? '-'

export async function sendCustomRequestNotification(r: CustomRequestInput) {
  if (notifyList().length === 0) return
  const html = wrap(`
    <h1 style="font-size:22px">Nuova richiesta su misura</h1>
    <p><strong>${esc(r.name)}</strong> · ${esc(r.email)}${r.phone ? ` · ${esc(r.phone)}` : ''}</p>
    <p><strong>Pezzo:</strong> ${esc(label(PIECE_TYPES, r.pieceType))}<br><strong>Budget:</strong> ${esc(label(BUDGET_RANGES, r.budgetRange))}</p>
    <p style="white-space:pre-wrap;padding:12px;background:#f4f4f4">${esc(r.message)}</p>
    ${r.references.length ? `<p><strong>Riferimenti:</strong><br>${r.references.map((u) => `<a href="${esc(u)}">${esc(u)}</a>`).join('<br>')}</p>` : ''}
    <p>Rispondi a questa email per scrivere direttamente a ${esc(r.name.split(' ')[0] ?? '')}. La richiesta è anche in Studio, sezione Richieste su misura.</p>`)
  await send(notifyList(), `Su misura: ${r.name} · ${label(PIECE_TYPES, r.pieceType)}`, html, r.email)
}

export async function sendCustomRequestConfirmation(r: CustomRequestInput) {
  const html = wrap(`
    <h1 style="font-size:22px">Ricevuto, ${esc(r.name.split(' ')[0] ?? '')}.</h1>
    <p>Grazie per avermi scritto. Leggo la tua idea e ti rispondo <strong>entro 24 ore</strong> con qualche domanda o una prima proposta.</p>
    <p style="white-space:pre-wrap;padding:12px;background:#f4f4f4;color:#555">${esc(r.message)}</p>
    <p>Se nel frattempo vuoi aggiungere qualcosa, rispondi a questa email.</p>
    <p>FRENZ</p>`)
  await send(r.email, 'La tua richiesta su misura', html, replyToFrenz())
}
