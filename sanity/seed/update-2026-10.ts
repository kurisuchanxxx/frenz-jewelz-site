/**
 * Aggiornamento dati dopo l'incontro con FRENZ (ottobre 2026). Una tantum, ma rieseguibile.
 *
 *   node --env-file-if-exists=.env seed/update-2026-10.ts
 *
 * - Prodotti: tutti pezzi unici (stock 1), prezzi, misure e pesi dalla tabella di FRENZ,
 *   categoria Ciondoli (venduti senza catena).
 * - Ritirati dal sito (restano in Studio come bozze): TicTac, Nemico Pubblico, 2PAC, Wu-Tang.
 * - Impostazioni: spedizione 13 € a ordine, Instagram, email, dati legali, testo collab.
 * - Pagine legali e info: testi aggiornati da seed/pages.ts.
 */
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {createClient} from '@sanity/client'
import {DRAFT_PAGES} from './pages.ts'
import {textToBlocks} from './blocks.ts'

const {authToken} = JSON.parse(readFileSync(`${homedir()}/.config/sanity/config.json`, 'utf8')) as {authToken?: string}
if (!authToken) throw new Error('Fai prima `npx sanity login`.')
const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'd2cmi1jx',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  apiVersion: '2026-09-01',
  token: authToken,
  useCdn: false,
})

// Tabella di FRENZ: larghezza × altezza in cm, prezzo in centesimi, peso in grammi.
const PRODUCTS: Record<string, {price: number; size: string; weight: string; short: string; featured: boolean}> = {
  '2000': {price: 15000, size: '3,9 × 2,2 cm', weight: '7,3 g', featured: true, short: 'Ciondolo 2000 in lettering graffiti, argento 925 traforato a mano. Pezzo unico.'},
  '1312': {price: 10000, size: '2,6 × 0,9 cm', weight: '1,9 g', featured: false, short: 'Ciondolo 1312 in argento 925 traforato a mano. Pezzo unico.'},
  enemy: {price: 19000, size: '5,1 × 2,0 cm', weight: '3,8 g', featured: true, short: 'Enemy, dal brano di Noyz Narco. Ciondolo in argento 925 traforato a mano. Pezzo unico.'},
  classico: {price: 19000, size: '4,5 × 1,8 cm', weight: '7,6 g', featured: false, short: 'Classico, dal brano della Love Gang. Ciondolo in argento 925 traforato a mano. Pezzo unico.'},
  mizu: {price: 11000, size: '2,2 × 2,4 cm', weight: '2,2 g', featured: true, short: '水, il simbolo dell’acqua. Ciondolo in argento 925 traforato a mano. Pezzo unico.'},
  'gothic-s': {price: 12000, size: '1,9 × 2,6 cm', weight: '2,4 g', featured: true, short: 'Lettera S in stile gotico, argento 925 traforato a mano. Pezzo unico.'},
  palestina: {price: 10500, size: '3,8 × 1,0 cm', weight: '2,5 g', featured: false, short: 'Palestine. Sagoma della Palestina in argento 925 traforata a mano. Pezzo unico.'},
}
const RETIRED = ['tictac', 'nemico-pubblico', '2pac', 'wu-tang']

const categoryId = await client.fetch<string>(`*[_type == "category" && slug.current == "ciondoli"][0]._id`)

// 1. Prodotti in vendita
for (const [slug, p] of Object.entries(PRODUCTS)) {
  const doc = await client.fetch<{_id: string; title: string} | null>(`*[_type == "product" && slug.current == $slug][0]{_id, title}`, {slug})
  if (!doc) {
    console.log(`- ${slug}: non trovato`)
    continue
  }
  await client
    .patch(doc._id)
    .set({
      price: p.price,
      productionType: 'pezzoUnico',
      stock: 1,
      isAvailable: true,
      featured: p.featured,
      category: {_type: 'reference', _ref: categoryId},
      shortDescription: p.short,
      'details.dimensions': p.size,
      'details.weight': p.weight,
      'images[0].alt': `Ciondolo ${doc.title} in argento 925`,
    })
    .unset(['details.chainLength'])
    .commit()
  console.log(`~ ${doc.title}`)
}

// 2. Ritirati: diventano bozze (invisibili sul sito, recuperabili in Studio con "Pubblica")
for (const slug of RETIRED) {
  const doc = await client.fetch<Record<string, unknown> & {_id: string} | null>(`*[_type == "product" && slug.current == $slug && !(_id in path("drafts.**"))][0]`, {slug})
  if (!doc) continue
  const {_id, _rev, _createdAt, _updatedAt, ...rest} = doc
  await client
    .transaction()
    .createOrReplace({...rest, _id: `drafts.${_id}`, _type: 'product', featured: false})
    .delete(_id)
    .commit()
  console.log(`- ritirato ${slug} (ora bozza)`)
}

// 3. Impostazioni sito
await client
  .patch('siteSettings')
  .set({
    shippingOptions: [{_key: 'standard', _type: 'shippingOption', label: 'Spedizione Italia', price: 1300, minDays: 2, maxDays: 4}],
    instagramUrl: 'https://www.instagram.com/frenz.jewelz/',
    contactEmail: 'frjewelzlab@gmail.com',
    legalName: 'Daniela B. Gioielleria Artigiana',
    vatNumber: '02116050424',
    legalAddress: 'Corso Matteotti 64, 60033 Chiaravalle (AN)',
    collabIntro:
      'Le collab nascono dalla voglia di mettermi in gioco e dall’amore per una cultura che mi ha dato molto e continua a sorprendermi giorno dopo giorno. Ho scelto loro semplicemente per il momento che vivevo: era la roba che mi pompavo in quel periodo.',
  })
  .unset(['facebookUrl', 'freeShippingThreshold'])
  .commit()
console.log('~ impostazioni sito')

// 4. Pagine legali e info
for (const page of DRAFT_PAGES) {
  const id = await client.fetch<string | null>(`*[_type == "page" && slug.current == $slug][0]._id`, {slug: page.slug})
  if (!id) continue
  await client.patch(id).set({body: textToBlocks(page.body)}).commit()
  console.log(`~ pagina ${page.title}`)
}

console.log('Fatto.')
