import {createClient} from '@sanity/client'
import {SANITY_API_READ_TOKEN, SANITY_API_WRITE_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID} from 'astro:env/server'
import {API_VERSION} from './sanity'

/**
 * Client con token di scrittura: solo per webhook Stripe e form.
 * Senza CDN: qui servono letture fresche (stock) prima di scrivere.
 */
export function getSanityWriter() {
  if (!SANITY_API_WRITE_TOKEN) throw new Error('SANITY_API_WRITE_TOKEN non configurato')
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: API_VERSION,
    token: SANITY_API_WRITE_TOKEN,
    useCdn: false,
    perspective: 'published',
  })
}

/** Lettura fresca (senza CDN) per i controlli di stock al checkout. */
export function getSanityFresh() {
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: API_VERSION,
    token: SANITY_API_READ_TOKEN,
    useCdn: false,
    perspective: 'published',
  })
}
