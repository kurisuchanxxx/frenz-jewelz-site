# Frenz Jewelz

E-commerce di frenzjewelz.it. Astro 7 (on-demand su Cloudflare Workers) + Sanity (CMS) + Stripe Checkout.

```
/src/pages        route ed endpoint /api
/src/components   componenti Astro
/src/islands      parti interattive (carrello, galleria), fase 2-3
/src/lib          client Sanity, query GROQ, prezzi, disponibilità
/sanity           Sanity Studio (pacchetto separato, deploy su frenzjewelz.sanity.studio)
/public           favicon, logo, _redirects
```

## Scelte tecniche

- **Cloudflare Workers, non Pages.** Dalla v13 l'adapter `@astrojs/cloudflare` non supporta più Pages. Workers ha lo stesso free tier (100k richieste/giorno), permette l'uso commerciale e serve comunque `public/_redirects` e `_headers`.
- **Pagine renderizzate a ogni richiesta** (`output: 'server'`). Prezzi, stock e testi modificati in Studio sono online subito, senza rebuild né webhook di deploy. Le letture passano dall'API CDN di Sanity.
- **Dataset Sanity privato.** Contiene ordini e richieste con dati personali: il sito legge sempre con `SANITY_API_READ_TOKEN`. Le immagini restano pubbliche sul CDN di Sanity.
- **Immagini dal CDN Sanity** (AVIF/WebP automatici, srcset responsive). `imageService: 'passthrough'`, quindi nessun binding Cloudflare Images a pagamento.
- **Studio separato**, non embedded: il Worker resta leggero, senza React.
- **Prezzi in centesimi interi** ovunque. Disponibilità calcolata in un solo punto: `src/lib/availability.ts`.

## Setup locale

Requisiti: Node 22.12+.

### 1. Sanity

```bash
cd sanity
npm install
cp .env.example .env        # SANITY_STUDIO_PROJECT_ID=d2cmi1jx
npx sanity login
npm run dev                 # Studio su http://localhost:3333
npm run seed                # categorie, impostazioni, prodotto di test
```

Su sanity.io/manage, nel progetto:
- **Datasets**: `production` deve essere **Private**.
- **API > Tokens**: crea un token *Viewer* (`SANITY_API_READ_TOKEN`) e uno *Editor* (`SANITY_API_WRITE_TOKEN`, fase 3).
- **API > CORS origins**: aggiungi `http://localhost:3333` e l'URL dello Studio.

Deploy dello Studio: `npm run deploy` (dentro `/sanity`).

### 2. Sito

```bash
npm install
cp .env.example .env        # SANITY_PROJECT_ID, SANITY_API_READ_TOKEN, ...
npm run dev                 # http://localhost:4321 (runtime workerd, come in produzione)
npm run check               # typecheck
```

## Deploy (Cloudflare Workers)

```bash
npx wrangler login
npm run deploy              # astro build && wrangler deploy
```

Segreti del Worker, una volta sola (e ogni volta che cambiano):

```bash
npx wrangler secret put SANITY_API_READ_TOKEN
```

Stessa cosa per `SANITY_API_WRITE_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `BREVO_API_KEY`, `BREVO_LIST_ID`, `TURNSTILE_SECRET_KEY`, `ORDER_NOTIFICATION_EMAIL`.

I valori pubblici (`SANITY_PROJECT_ID`, `SANITY_DATASET`, `PUBLIC_SITE_URL`, `PUBLIC_TURNSTILE_SITE_KEY`) vengono letti **al build**: vanno nel `.env` locale o nelle variabili di build di Workers Builds, se il deploy parte da Git.

## Variabili d'ambiente

| Nome | Dove | A cosa serve |
|---|---|---|
| `PUBLIC_SITE_URL` | build | URL canonico, sitemap, Open Graph |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | build | progetto Sanity |
| `SANITY_API_READ_TOKEN` | secret | lettura del dataset privato |
| `SANITY_API_WRITE_TOKEN` | secret | ordini e richieste (solo server) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | checkout e webhook |
| `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL` | secret | email transazionali |
| `BREVO_API_KEY`, `BREVO_LIST_ID` | secret | lista personalizzazione |
| `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY` | secret / build | anti-spam dei form |

Lo schema tipizzato è in `astro.config.mjs` (`env.schema`); nel codice si importano da `astro:env/server`.

## Aggiungere un prodotto (per FRENZ)

1. Apri lo Studio, vai su **Prodotti** e premi **+**.
2. **Principale**: nome, slug (premi *Generate*), categoria.
3. **Foto**: prima foto = copertina nello shop. Sempre lo stesso sfondo e ritaglio. Scrivi il testo alternativo.
4. **Prezzo e disponibilità**: prezzo in centesimi (60 € = `6000`), tipo di produzione, pezzi disponibili.
5. **Pubblica**. Il prodotto è online subito.

Lo stock scala da solo a ogni ordine. Per togliere un prodotto dalla vendita senza cancellarlo, spegni **In vendita**.

## Stato

- [x] **Fase 1, fondamenta**: progetto Sanity `d2cmi1jx` (org Ctrl Studio, dataset privato), seed caricato, prodotto di test visibile in `/shop` in locale. Da fare: `sanity deploy` dello Studio.
- [ ] Fase 2, catalogo
- [ ] Fase 3, checkout
- [ ] Fase 4, form e legali
- [ ] Fase 5, go-live
