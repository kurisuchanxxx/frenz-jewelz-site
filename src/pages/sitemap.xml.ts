import type {APIRoute} from 'astro'
import {sanity} from '../lib/sanity'

export const prerender = false

const STATIC = ['/', '/shop', '/su-misura', '/collab', '/spedizioni-resi', '/guida', '/termini', '/privacy', '/cookie', '/about']

/** Sitemap generata a ogni richiesta: prodotti e pagine arrivano da Sanity. */
export const GET: APIRoute = async ({site, request}) => {
  const origin = (site ?? new URL(request.url)).origin
  const [products, pages] = await Promise.all([
    sanity.fetch<{slug: string; updated: string}[]>(`*[_type == "product" && defined(slug.current)]{"slug": slug.current, "updated": _updatedAt}`),
    sanity.fetch<{slug: string; updated: string}[]>(`*[_type == "page" && defined(slug.current)]{"slug": slug.current, "updated": _updatedAt}`),
  ])
  const pageSlugs = new Set(pages.map((p) => p.slug))

  const urls: {loc: string; lastmod?: string}[] = [
    ...STATIC.filter((p) => p === '/' || !['about', 'spedizioni-resi', 'guida', 'termini', 'privacy', 'cookie'].includes(p.slice(1)) || pageSlugs.has(p.slice(1))).map((p) => ({loc: p})),
    ...products.map((p) => ({loc: `/shop/${p.slug}`, lastmod: p.updated})),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${origin}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, {headers: {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}})
}
