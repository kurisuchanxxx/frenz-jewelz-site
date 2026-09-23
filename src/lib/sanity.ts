import {createClient} from '@sanity/client'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import {SANITY_API_READ_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID} from 'astro:env/server'

export const API_VERSION = '2026-09-01'

/**
 * Client di sola lettura. Il dataset è privato (contiene ordini e richieste con dati personali),
 * quindi anche le letture pubbliche passano dal token. Usare solo lato server.
 */
export const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: API_VERSION,
  token: SANITY_API_READ_TOKEN,
  useCdn: true,
  perspective: 'published',
})

const imageBuilder = createImageUrlBuilder({projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET})

/** URL immagine dal CDN Sanity: AVIF/WebP automatico in base al browser, rispetta hotspot e crop. */
export const urlFor = (source: SanityImageSource) => imageBuilder.image(source).auto('format').fit('crop')
