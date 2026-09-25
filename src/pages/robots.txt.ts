import type {APIRoute} from 'astro'

export const prerender = false

/** Sull'indirizzo di prova *.workers.dev blocchiamo tutto: indicizzabile solo il dominio vero. */
export const GET: APIRoute = ({url}) => {
  const preview = url.hostname.endsWith('.workers.dev') || url.hostname === 'localhost'
  const body = preview
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /ordine/\n\nSitemap: ${url.origin}/sitemap.xml\n`
  return new Response(body, {headers: {'Content-Type': 'text/plain; charset=utf-8'}})
}
