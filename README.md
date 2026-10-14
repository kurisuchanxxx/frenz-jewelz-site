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

> **Se il progetto sta in una cartella iCloud** (Desktop, Documenti): macOS può "ottimizzare lo spazio" e scaricare dal disco i file di `node_modules`, e Node resta appeso. Su questo Mac le dipendenze stanno fuori dal progetto, in `~/.cache/frenz-website/{site,sanity}/node_modules`, con `node_modules` come symlink (fuori da iCloud e fuori dalla scansione di Vite; non in `~/Library/Caches`, che macOS svuota da solo). Dopo un `rm -rf node_modules` rifare: `npm ci && mv node_modules ~/.cache/frenz-website/site/node_modules && ln -s ~/.cache/frenz-website/site/node_modules node_modules` (idem in `sanity/`). Meglio ancora: tenere il repo fuori da iCloud.

### 1. Sanity

```bash
cd sanity
npm install
cp .env.example .env        # SANITY_STUDIO_PROJECT_ID=d2cmi1jx
npx sanity login
npm run dev                 # Studio su http://localhost:3333
npm run seed                # categorie, impostazioni, prodotti, collab, pagine (idempotente)
node seed/update-2026-10.ts # dati concordati con FRENZ a ottobre 2026 (prezzi, pezzi unici, ritirati, legali)
```

Su sanity.io/manage, nel progetto:
- **Datasets**: `production` deve essere **Private**.
- **API > Tokens**: crea un token *Viewer* (`SANITY_API_READ_TOKEN`) e uno *Editor* (`SANITY_API_WRITE_TOKEN`, fase 3).
- **API > CORS origins**: aggiungi `http://localhost:3333` e l'URL dello Studio.

Deploy dello Studio: `npm run deploy` (dentro `/sanity`) → https://frenzjewelz.sanity.studio (già online).

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
PUBLIC_SITE_URL=https://frenzjewelz.it npm run deploy   # astro build && wrangler deploy
```

`PUBLIC_SITE_URL` viene letto **al build** (URL canonico, sitemap, ritorno da Stripe): nel `.env` locale è `http://localhost:4321`, quindi al deploy va passato quello di produzione. Finché il dominio non è attivo, usare l'URL `*.workers.dev`.

Segreti del Worker, una volta sola (e ogni volta che cambiano):

```bash
npx wrangler secret put SANITY_API_READ_TOKEN
```

Stessa cosa per `SANITY_API_WRITE_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `ORDER_NOTIFICATION_EMAIL` (più indirizzi separati da virgola).

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
5. Email (conferma al cliente, notifica a FRENZ, richieste su misura), senza provider esterno: partono dal Gmail di FRENZ via SMTP.
   - Su `frjewelzlab@gmail.com`: attivare la verifica in due passaggi, poi creare una **password per app** (Account Google → Sicurezza → Password per le app).
   - `GMAIL_USER=frjewelzlab@gmail.com` e `GMAIL_APP_PASSWORD=<16 caratteri>` come secret del Worker (mai nel repo né in chat).
   - `ORDER_NOTIFICATION_EMAIL`: uno o più indirizzi separati da virgola.
   - Limite Gmail circa 500 email/giorno. Se la password Google cambia, la password per app va rigenerata.
   - Alternativa: `RESEND_API_KEY` (dominio verificato su Resend). Gmail ha la precedenza se configurato.
   - In più, su Stripe → Impostazioni → Email clienti: attivare le ricevute per i pagamenti riusciti.

Test: carta `4242 4242 4242 4242`, qualsiasi data futura e CVC. Dopo il pagamento: ordine in Studio → Ordini → Da gestire, stock scalato, due email. Rilanciando lo stesso evento (`stripe events resend <id>`) l'ordine non si duplica.

## Variabili d'ambiente

| Nome | Dove | A cosa serve |
|---|---|---|
| `PUBLIC_SITE_URL` | build | URL canonico, sitemap, Open Graph |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | build | progetto Sanity |
| `SANITY_API_READ_TOKEN` | secret | lettura del dataset privato |
| `SANITY_API_WRITE_TOKEN` | secret | ordini e richieste (solo server) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | checkout e webhook |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | secret | email dal Gmail di FRENZ (canale principale) |
| `RESEND_API_KEY` | secret | alternativa a Gmail |
| `ORDER_NOTIFICATION_EMAIL` | secret | destinatari notifiche, separati da virgola |
| `PUBLIC_CF_BEACON_TOKEN` | build | Cloudflare Web Analytics (senza cookie); vuoto = nessuno script |
| `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY` | secret / build | anti-spam dei form. Senza chiavi il widget non appare e la verifica è saltata (solo honeypot) |

Lo schema tipizzato è in `astro.config.mjs` (`env.schema`); nel codice si importano da `astro:env/server`.

## Chi gestisce cosa (handoff a FRENZ)

| Cosa | Dove |
|---|---|
| Prodotti, foto, prezzi, stock, descrizioni, categorie, collab | Sanity Studio → https://frenzjewelz.sanity.studio |
| Testi pagine (about, spedizioni, legali), foto home e lookbook, barra annunci | Sanity Studio → Impostazioni sito / Pagine |
| Opzioni e costi di spedizione, soglia spedizione gratuita | Sanity Studio → Impostazioni sito (arrivano al checkout Stripe) |
| Ordini: stato, tracking, note. Richieste su misura | Sanity Studio → Ordini / Richieste su misura |
| Incassi, bonifici, rimborsi, contestazioni | Stripe Dashboard (account di FRENZ) |
| Metodi di pagamento (carta, Apple/Google Pay, PayPal, Klarna…) | Stripe → Impostazioni → Metodi di pagamento |
| Codici sconto | Stripe → Prodotti → Coupon (checkout con `allow_promotion_codes`) |
| Ricevute automatiche ed export transazioni | Stripe (le fatture elettroniche restano al commercialista) |
| Dominio, DNS, hosting, codice | Ctrl Studio |

## Aggiungere un prodotto (per FRENZ)

1. Apri lo Studio, vai su **Prodotti** e premi **+**.
2. **Principale**: nome, slug (premi *Generate*), categoria.
3. **Foto**: prima foto = copertina nello shop. Sempre lo stesso sfondo e ritaglio. Scrivi il testo alternativo.
4. **Prezzo e disponibilità**: prezzo in centesimi (60 € = `6000`), tipo di produzione, pezzi disponibili.
5. **Pubblica**. Il prodotto è online subito.

Lo stock scala da solo a ogni ordine. Per togliere un prodotto dalla vendita senza cancellarlo, spegni **In vendita**.

## Stato

- [x] **Fase 1, fondamenta**: progetto Sanity `d2cmi1jx` (org Ctrl Studio, dataset privato), seed caricato, prodotto di test visibile in `/shop` in locale. Studio online su frenzjewelz.sanity.studio.
- [ ] Fase 2, catalogo
- [~] **Fase 3, checkout**: codice completo (carrello, `/api/checkout`, webhook, email, pagine di ritorno). Da testare con chiavi Stripe di test.
- [~] **Fase 4**: form su misura e pagine legali/info compilate con i dati di Daniela B. Gioielleria Artigiana (restano tra [PARENTESI] corriere, tempi, IVA, servizio email). Newsletter tolta su richiesta di FRENZ.
- [~] Fase 5: sitemap, robots, redirect Aruba, analytics (con token) e **deploy di prova** su https://frenz-jewelz.christianraylantieri.workers.dev (secret Sanity caricati). Mancano: chiavi Stripe/Resend/Brevo/Turnstile in produzione, dominio e DNS, Stripe live, Lighthouse.
