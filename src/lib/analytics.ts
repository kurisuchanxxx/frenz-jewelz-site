/**
 * Google Analytics 4, solo con consenso (linee guida cookie del Garante, 2021).
 *
 * Finché la persona non sceglie non parte nessuno script di Google e non nasce nessun cookie:
 * gli eventi della pagina aspettano in memoria. "Accetta" carica GA e li invia, "Rifiuta" li butta.
 * La scelta vale 6 mesi, poi il banner ricompare. Senza PUBLIC_GA_MEASUREMENT_ID non succede nulla.
 *
 * Lo stato sta in localStorage e su window, non nel modulo: ogni <script> di Astro può avere
 * la sua copia di questo file e devono vedere tutti la stessa cosa.
 */
import {PUBLIC_GA_MEASUREMENT_ID as GA_ID} from 'astro:env/client'

export type Consent = 'granted' | 'denied'
type Params = Record<string, unknown>

const KEY = 'frenz-consent'
const PURCHASES_KEY = 'frenz-ga-purchases'
// Alzare di uno per richiedere il consenso a tutti, per esempio quando si aggiunge un servizio.
const VERSION = 1
const MAX_AGE = 180 * 24 * 60 * 60 * 1000
const EVENT = 'consent:change'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    frenzGaQueue?: [string, Params][]
  }
}

export const analyticsEnabled = Boolean(GA_ID)

export function getConsent(): Consent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {choice?: unknown; at?: number; v?: number} | null
    if (!saved || saved.v !== VERSION || typeof saved.at !== 'number' || Date.now() - saved.at > MAX_AGE) return null
    return saved.choice === 'granted' || saved.choice === 'denied' ? saved.choice : null
  } catch {
    return null
  }
}

export function setConsent(choice: Consent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({choice, at: Date.now(), v: VERSION}))
  } catch {
    /* storage bloccato: la scelta vale solo per questa pagina */
  }
  if (choice === 'granted') {
    loadGA()
    const queue = window.frenzGaQueue ?? []
    window.frenzGaQueue = []
    for (const [name, params] of queue) window.gtag?.('event', name, params)
  } else {
    window.frenzGaQueue = []
    stopGA()
  }
  window.dispatchEvent(new CustomEvent<Consent>(EVENT, {detail: choice}))
}

export function onConsentChange(fn: (choice: Consent) => void) {
  window.addEventListener(EVENT, (e) => fn((e as CustomEvent<Consent>).detail))
}

/** Da chiamare a ogni pagina: carica GA solo se c'è già il consenso. */
export function initAnalytics() {
  if (getConsent() === 'granted') loadGA()
}

export function track(name: string, params: Params) {
  if (!GA_ID) return
  const consent = getConsent()
  if (consent === 'granted') {
    loadGA()
    window.gtag!('event', name, params)
  } else if (consent === null) {
    ;(window.frenzGaQueue ??= []).push([name, params])
  }
}

/** Acquisto: una volta sola per ordine, anche se la pagina di ringraziamento viene ricaricata. */
export function trackPurchase(purchase: Params & {transaction_id: string}) {
  const id = purchase.transaction_id
  if (readPurchases().includes(id)) return
  const markSent = () => {
    try {
      localStorage.setItem(PURCHASES_KEY, JSON.stringify([...readPurchases(), id].slice(-20)))
    } catch {
      /* niente */
    }
  }
  track('purchase', purchase)
  const consent = getConsent()
  if (consent === 'granted') markSent()
  else if (consent === null) onConsentChange((choice) => choice === 'granted' && markSent())
}

/** Prodotto nel formato e-commerce di GA4. I prezzi del sito sono in centesimi, GA vuole euro. */
export function gaItem(p: {id: string; name: string; price: number; quantity?: number; category?: string}) {
  return {
    item_id: p.id,
    item_name: p.name,
    price: p.price / 100,
    quantity: p.quantity ?? 1,
    ...(p.category ? {item_category: p.category} : {}),
  }
}

function readPurchases(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(PURCHASES_KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function loadGA() {
  if (!GA_ID || window.gtag) return
  ;(window as unknown as Params)[`ga-disable-${GA_ID}`] = false
  window.dataLayer = window.dataLayer ?? []
  // gtag vuole proprio l'oggetto `arguments`, non un array.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments)
  }
  // Consenso chiesto solo per le statistiche: pubblicità e personalizzazione restano spente.
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {allow_google_signals: false, allow_ad_personalization_signals: false})
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.append(script)
}

/** Revoca: GA smette di inviare e i suoi cookie (_ga, _ga_*) spariscono. */
function stopGA() {
  if (!GA_ID) return
  ;(window as unknown as Params)[`ga-disable-${GA_ID}`] = true
  window.gtag?.('consent', 'update', {analytics_storage: 'denied'})
  // GA scrive i cookie sul dominio principale (.frenzjewelz.it): li cancelliamo su ogni livello.
  const parts = location.hostname.split('.')
  const domains = ['', ...parts.slice(0, -1).map((_, i) => `; domain=.${parts.slice(i).join('.')}`)]
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (!name.startsWith('_ga')) continue
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
  }
}
