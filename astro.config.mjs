// @ts-check
import {defineConfig, envField} from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import {loadEnv} from 'vite'

// astro.config gira prima del caricamento di .env: lo leggiamo a mano.
const {PUBLIC_SITE_URL} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')

// https://astro.build/config
export default defineConfig({
  site: PUBLIC_SITE_URL || 'https://frenzjewelz.it',
  // Catalogo, prezzi e stock arrivano da Sanity a ogni richiesta: FRENZ modifica in Studio
  // e il sito è aggiornato senza rebuild. Le pagine senza dati si marcano `prerender = true`.
  output: 'server',
  adapter: cloudflare({
    // Le immagini sono servite e ottimizzate dal CDN di Sanity: niente binding Images a pagamento.
    imageService: 'passthrough',
  }),
  // Il carrello vive in localStorage: nessuna sessione server, nessun KV da configurare.
  session: false,
  trailingSlash: 'never',
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({context: 'client', access: 'public', optional: true}),
      SANITY_PROJECT_ID: envField.string({context: 'server', access: 'public'}),
      SANITY_DATASET: envField.string({context: 'server', access: 'public', default: 'production'}),
      SANITY_API_READ_TOKEN: envField.string({context: 'server', access: 'secret'}),
      SANITY_API_WRITE_TOKEN: envField.string({context: 'server', access: 'secret', optional: true}),
      STRIPE_SECRET_KEY: envField.string({context: 'server', access: 'secret', optional: true}),
      STRIPE_WEBHOOK_SECRET: envField.string({context: 'server', access: 'secret', optional: true}),
      RESEND_API_KEY: envField.string({context: 'server', access: 'secret', optional: true}),
      BREVO_API_KEY: envField.string({context: 'server', access: 'secret', optional: true}),
      BREVO_LIST_ID: envField.number({context: 'server', access: 'secret', optional: true}),
      BREVO_DOI_TEMPLATE_ID: envField.number({context: 'server', access: 'secret', optional: true}),
      TURNSTILE_SECRET_KEY: envField.string({context: 'server', access: 'secret', optional: true}),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({context: 'client', access: 'public', optional: true}),
      ORDER_NOTIFICATION_EMAIL: envField.string({context: 'server', access: 'secret', optional: true}),
    },
  },
})
