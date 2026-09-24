import {TURNSTILE_SECRET_KEY} from 'astro:env/server'

/**
 * Verifica il token Cloudflare Turnstile. Senza chiave configurata (sviluppo) passa sempre:
 * il honeypot nel form resta comunque attivo.
 */
export async function verifyTurnstile(token: string | null, ip: string | undefined): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip}),
    })
    const data = (await res.json()) as {success?: boolean}
    return data.success === true
  } catch {
    return false
  }
}
