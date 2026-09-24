// Valori condivisi tra form, endpoint e Studio (sanity/schemaTypes/documents/customRequest.ts).
export const PIECE_TYPES = [
  {value: 'collana', label: 'Collana / ciondolo'},
  {value: 'anello', label: 'Anello'},
  {value: 'bracciale', label: 'Bracciale'},
  {value: 'altro', label: 'Altro'},
] as const

export const BUDGET_RANGES = [
  {value: 'fino100', label: 'Fino a 100 €'},
  {value: '100-200', label: '100-200 €'},
  {value: '200-400', label: '200-400 €'},
  {value: 'oltre400', label: 'Oltre 400 €'},
  {value: 'nonSo', label: 'Non so ancora'},
] as const

export interface CustomRequestInput {
  name: string
  email: string
  phone?: string
  pieceType: (typeof PIECE_TYPES)[number]['value']
  budgetRange?: (typeof BUDGET_RANGES)[number]['value']
  message: string
  references: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Valida i campi del form. Ritorna i dati puliti oppure un messaggio d'errore per l'utente. */
export function parseCustomRequest(form: FormData): {data: CustomRequestInput} | {error: string} {
  const str = (k: string) => String(form.get(k) ?? '').trim()
  const name = str('name')
  const email = str('email')
  const phone = str('phone')
  const pieceType = str('pieceType')
  const budgetRange = str('budgetRange')
  const message = str('message')
  const references = str('references')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)

  if (name.length < 2 || name.length > 100) return {error: 'Inserisci il tuo nome.'}
  if (!EMAIL_RE.test(email) || email.length > 200) return {error: 'Controlla l’indirizzo email.'}
  if (phone.length > 40) return {error: 'Numero di telefono troppo lungo.'}
  if (!PIECE_TYPES.some((p) => p.value === pieceType)) return {error: 'Scegli il tipo di pezzo.'}
  if (budgetRange && !BUDGET_RANGES.some((b) => b.value === budgetRange)) return {error: 'Budget non valido.'}
  if (message.length < 10) return {error: 'Raccontaci qualcosa in più sull’idea (almeno 10 caratteri).'}
  if (message.length > 3000) return {error: 'Messaggio troppo lungo (massimo 3000 caratteri).'}
  if (!references.every((r) => /^https?:\/\/\S+$/.test(r) && r.length < 500)) return {error: 'I riferimenti devono essere link che iniziano con http:// o https://.'}
  if (form.get('privacy') !== 'on') return {error: 'Serve il consenso al trattamento dei dati per rispondere.'}

  return {
    data: {
      name,
      email,
      phone: phone || undefined,
      pieceType: pieceType as CustomRequestInput['pieceType'],
      budgetRange: (budgetRange || undefined) as CustomRequestInput['budgetRange'],
      message,
      references,
    },
  }
}
