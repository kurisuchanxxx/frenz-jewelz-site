import type {APIRoute} from 'astro'
import {parseCustomRequest} from '../../lib/custom-request'
import {verifyTurnstile} from '../../lib/turnstile'
import {getSanityWriter} from '../../lib/sanity-write'
import {sendCustomRequestConfirmation, sendCustomRequestNotification} from '../../lib/email'

export const prerender = false

// Il form fa un POST classico: rispondiamo con un redirect alla pagina, con esito nella query.
const back = (params: Record<string, string>) =>
  new Response(null, {status: 303, headers: {Location: `/su-misura?${new URLSearchParams(params)}#form`}})

export const POST: APIRoute = async ({request, clientAddress}) => {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return back({errore: 'Invio non valido.'})
  }

  // Honeypot: campo nascosto che un umano non compila.
  if (String(form.get('website') ?? '') !== '') return back({ok: '1'})

  if (!(await verifyTurnstile(String(form.get('cf-turnstile-response') ?? '') || null, clientAddress))) {
    return back({errore: 'Verifica anti-spam non superata. Riprova.'})
  }

  const parsed = parseCustomRequest(form)
  if ('error' in parsed) return back({errore: parsed.error})
  const data = parsed.data

  try {
    await getSanityWriter().create({
      _type: 'customRequest',
      status: 'nuova',
      name: data.name,
      email: data.email,
      phone: data.phone,
      pieceType: data.pieceType,
      budgetRange: data.budgetRange,
      message: data.message,
      references: data.references.map((url, i) => ({_key: `r${i}`, _type: 'referenceLink', url})),
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Sanity customRequest', err)
    return back({errore: 'Non siamo riusciti a salvare la richiesta. Riprova tra poco o scrivici via email.'})
  }

  // L'email non deve far fallire l'invio: la richiesta è già in Studio.
  await Promise.allSettled([sendCustomRequestNotification(data), sendCustomRequestConfirmation(data)])

  return back({ok: '1'})
}
