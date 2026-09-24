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

> **Se il progetto sta in una cartella iCloud** (Desktop, Documenti): macOS può "ottimizzare lo spazio" e scaricare dal disco i file di `node_modules`, e Node resta appeso. Su questo Mac le dipendenze stanno in `node_modules.nosync` (iCloud ignora i `.nosync`) con `node_modules` come symlink. Dopo un `rm -rf node_modules` rifare: `npm ci && mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules`. Meglio ancora: tenere il repo fuori da iCloud.

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

## Stripe (checkout e webhook)

Flusso: carrello in localStorage → `POST /api/checkout` ricalcola prezzi e stock da Sanity e crea una Checkout Session (30 min, indirizzo e telefono, opzioni di spedizione da *Impostazioni sito*) → Stripe → `/ordine/grazie` o `/ordine/annullato`. Il webhook `POST /api/stripe-webhook` su `checkout.session.completed` crea l'ordine in Sanity (`_id = order-<session>`, quindi mai duplicato), scala lo stock e manda le email. Se un pezzo era già finito, l'ordine nasce **da verificare** e FRENZ riceve un avviso.

Setup, in modalità test:

1. Dashboard Stripe → Sviluppatori → chiave segreta di test in `STRIPE_SECRET_KEY`.
2. **Impostazioni → Dettagli pubblici → URL termini di servizio**: `https://frenzjewelz.it/termini`. Senza questo, Stripe rifiuta la sessione (chiediamo l'accettazione dei termini al checkout).
3. Webhook in locale, con la Stripe CLI:

```bash
stripe listen --forward-to localhost:4321/api/stripe-webhook
```

Il comando stampa un `whsec_…`: va in `STRIPE_WEBHOOK_SECRET`. In produzione si crea un endpoint su Dashboard → Webhook con l'evento `checkout.session.completed` e si usa il suo secret.

4. Token Sanity *Editor* in `SANITY_API_WRITE_TOKEN` (il webhook scrive ordini e stock).
5. Resend: verificare il dominio `frenzjewelz.it` (DNS) e mettere la chiave in `RESEND_API_KEY`; `ORDER_NOTIFICATION_EMAIL` è l'indirizzo di FRENZ. Il mittente è in `src/lib/email.ts`.

Test: carta `4242 4242 4242 4242`, qualsiasi data futura e CVC. Dopo il pagamento: ordine in Studio → Ordini → Da gestire, stock scalato, due email. Rilanciando lo stesso evento (`stripe events resend <id>`) l'ordine non si duplica.

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
| `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY` | secret / build | anti-spam dei form. Senza chiavi il widget non appare e la verifica è saltata (solo honeypot) |

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
- [~] **Fase 3, checkout**: codice completo (carrello, `/api/checkout`, webhook, email, pagine di ritorno). Da testare con chiavi Stripe di test.
- [~] **Fase 4**: form su misura (`/su-misura` → `/api/custom-request`, Turnstile + honeypot, richiesta in Studio + email). Mancano newsletter e pagine legali.
- [ ] Fase 5, go-live
