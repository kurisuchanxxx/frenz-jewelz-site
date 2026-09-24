import type {APIRoute} from 'astro'
import {BREVO_API_KEY, BREVO_DOI_TEMPLATE_ID, BREVO_LIST_ID} from 'astro:env/server'
import {PUBLIC_SITE_URL} from 'astro:env/client'

export const prerender = false

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST classico dal box "Personalizzazione": redirect alla pagina di provenienza con esito.
const back = (request: Request, params: Record<string, string>) => {
  const from = request.headers.get('referer')
  const url = from ? new URL(from) : new URL('/shop', PUBLIC_SITE_URL ?? request.url)
  for (const k of ['nl', 'nlErrore']) url.searchParams.delete(k)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.hash = 'newsletter'
  return new Response(null, {status: 303, headers: {Location: url.pathname + url.search + url.hash}})
}

export const POST: APIRoute = async ({request}) => {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return back(request, {nlErrore: 'Invio non valido.'})
  }

  if (String(form.get('website') ?? '') !== '') return back(request, {nl: 'ok'}) // honeypot
  const email = String(form.get('email') ?? '').trim()
  if (!EMAIL_RE.test(email) || email.length > 200) return back(request, {nlErrore: 'Controlla l’indirizzo email.'})
  if (form.get('consent') !== 'on') return back(request, {nlErrore: 'Serve il consenso per iscriverti.'})

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.warn('Brevo non configurato: iscrizione non salvata', email)
    return back(request, {nlErrore: 'Iscrizione momentaneamente non disponibile. Riprova più tardi.'})
  }

  const headers = {'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json'}
  const site = PUBLIC_SITE_URL ?? new URL(request.url).origin

  // Double opt-in se c'è un template DOI su Brevo; altrimenti iscrizione diretta.
  const res = BREVO_DOI_TEMPLATE_ID
    ? await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          includeListIds: [BREVO_LIST_ID],
          templateId: BREVO_DOI_TEMPLATE_ID,
          redirectionUrl: `${site}/shop?nl=confermata#newsletter`,
        }),
      })
    : await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({email, listIds: [BREVO_LIST_ID], updateEnabled: true}),
      })

  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    // Contatto già presente: per l'utente è comunque un successo.
    if (text.includes('duplicate_parameter') || text.includes('already')) return back(request, {nl: 'ok'})
    console.error('Brevo', res.status, text)
    return back(request, {nlErrore: 'Non siamo riusciti a iscriverti. Riprova tra poco.'})
  }

  return back(request, {nl: BREVO_DOI_TEMPLATE_ID ? 'conferma' : 'ok'})
}
