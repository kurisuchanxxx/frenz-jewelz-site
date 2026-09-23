/**
 * Dati iniziali: categorie, impostazioni sito e un prodotto di test.
 * Idempotente: se un documento esiste già (stesso slug) non viene ricreato.
 *
 *   npm run seed
 *
 * Usa il login della CLI (`npx sanity login`), non serve un token.
 */
import {createReadStream} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-01'})
const asset = (name: string) => fileURLToPath(new URL(`./assets/${name}`, import.meta.url))

const CATEGORIES = [
  {title: 'Collane', slug: 'collane', sortOrder: 10},
  {title: 'Ciondoli', slug: 'ciondoli', sortOrder: 20},
  {title: 'Anelli', slug: 'anelli', sortOrder: 30},
  {title: 'Bracciali', slug: 'bracciali', sortOrder: 40},
]

async function uploadImage(file: string) {
  const doc = await client.assets.upload('image', createReadStream(asset(file)), {filename: file})
  return {_type: 'reference' as const, _ref: doc._id}
}

async function seedCategories() {
  const ids: Record<string, string> = {}
  for (const c of CATEGORIES) {
    const existing = await client.fetch<string | null>(
      `*[_type == "category" && slug.current == $slug][0]._id`,
      {slug: c.slug},
    )
    if (existing) {
      ids[c.slug] = existing
      continue
    }
    const created = await client.create({
      _type: 'category',
      title: c.title,
      slug: {_type: 'slug', current: c.slug},
      sortOrder: c.sortOrder,
    })
    ids[c.slug] = created._id
    console.log(`+ categoria ${c.title}`)
  }
  return ids
}

const img = async (file: string, alt: string, key: string) => ({
  _key: key,
  _type: 'imageWithAlt' as const,
  asset: await uploadImage(file),
  alt,
})

async function seedSettings() {
  const heroImages = await Promise.all([
    img('DSC_0151.webp', 'Mani che tendono una catena FRENZ in argento', 'h1'),
    img('DSC_0134.webp', 'Ragazzo mostra anello e collana FRENZ', 'h2'),
    img('DSC_0113.webp', 'Pugno con anello FRENZ in argento', 'h3'),
    img('DSC_0255.webp', 'Catena FRENZ stretta tra i denti', 'h4'),
    img('DSC_0167.webp', 'Ciondolo FRENZ tenuto con due mani', 'h5'),
    img('DSC_0119.webp', 'Pugno con anello davanti a un muro graffitato', 'h6'),
    img('DSC_0158.webp', 'Bracciale e anello FRENZ indossati', 'h7'),
  ])
  const lookbookImages = await Promise.all([
    img('DSC_0292.webp', 'Ciondolo in argento su petto tatuato', 'l1'),
    img('DSC_0199.webp', 'Mano con anelli sul viso', 'l2'),
    img('DSC_0030.webp', 'Bracciale 1312 al polso', 'l3'),
    img('DSC_0313.webp', 'Collana Classico in argento', 'l4'),
    img('DSC_0215.webp', 'Pugno con bracciale e collana', 'l5'),
    img('DSC_0317.webp', 'Ciondolo in argento su collana sottile', 'l6'),
  ])
  const defaults = {
    heroImages,
    lookbookImages,
    heroHeadline: 'Pezzi creati per chi la strada la vive davvero',
    heroSubline: 'Argento 925. Lavorato a mano, ad Ancona.',
    collabHeadline: 'Collaborazioni',
    collabSubline: 'Pezzi unici per artisti, creator e persone che vivono la strada davvero.',
    // DA CONFERMARE con FRENZ: corriere, prezzi e tempi (domanda aperta 2).
    shippingOptions: [
      {_key: 'standard', _type: 'shippingOption', label: 'Spedizione Italia', price: 690, minDays: 2, maxDays: 4},
    ],
    instagramUrl: 'https://www.instagram.com/',
  }
  // Se esiste già, riempie solo i campi vuoti: le modifiche fatte in Studio restano.
  await client
    .transaction()
    .createIfNotExists({_id: 'siteSettings', _type: 'siteSettings'})
    .patch('siteSettings', (p) => p.setIfMissing(defaults).unset(['heroImage']))
    .commit()
  console.log('+ impostazioni sito')
}

const paragraph = (text: string, key: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: `${key}s`, text, marks: []}],
})

async function seedAboutPage() {
  const exists = await client.fetch<boolean>(`defined(*[_type == "page" && slug.current == "about"][0]._id)`)
  if (exists) return
  await client.create({
    _type: 'page',
    title: 'About',
    slug: {_type: 'slug', current: 'about'},
    // Testo del sito attuale, spezzato in paragrafi brevi.
    body: [
      paragraph(
        'FRENZ è un orafo italiano con base ad Ancona. Il suo lavoro nasce nel punto in cui la disciplina della gioielleria incontra il linguaggio urbano.',
        'p1',
      ),
      paragraph(
        'Dopo la formazione a Chiaravalle e il perfezionamento a Valenza, capitale europea dell’oreficeria, sviluppa una ricerca personale sul traforo, sull’argento e sulla costruzione di pezzi unici.',
        'p2',
      ),
      paragraph(
        'Ogni gioiello prende forma dalla materia grezza: fusione, taglio, modellazione, finitura. Un processo fisico, diretto, senza scorciatoie.',
        'p3',
      ),
      paragraph(
        'Tradizione orafa e stile underground si incontrano in pezzi in argento 925, realizzati a mano e pensati per essere indossati, vissuti, riconosciuti.',
        'p4',
      ),
      paragraph(
        'Dalle commissioni private alle collaborazioni con artisti della scena rap e hip hop, il pezzo resta sempre al centro.',
        'p5',
      ),
    ],
    images: await Promise.all([
      img('DSC_0199.webp', 'FRENZ con la mano sul viso, anelli in argento', 'a1'),
      img('DSC_0119.webp', 'Pugno con anello FRENZ davanti a un muro graffitato', 'a2'),
      img('DSC_0151.webp', 'Mani che tendono una catena FRENZ', 'a3'),
    ]),
    seo: {metaDescription: 'FRENZ è un orafo di Ancona: gioielli in argento 925 fatti a mano, tra tradizione orafa e cultura urbana.'},
  })
  console.log('+ pagina About')
}

const COLLABS = [
  {artistName: 'INOKI', slug: 'inoki', file: 'inoki.webp', alt: 'INOKI, ritratto', sortOrder: 10},
  {artistName: 'ELE-A', slug: 'ele-a', file: 'ele-a.webp', alt: 'ELE-A, ritratto', sortOrder: 20},
]

async function seedCollabs() {
  for (const c of COLLABS) {
    const exists = await client.fetch<boolean>(
      `defined(*[_type == "collaboration" && slug.current == $slug][0]._id)`,
      {slug: c.slug},
    )
    if (exists) continue
    await client.create({
      _type: 'collaboration',
      artistName: c.artistName,
      slug: {_type: 'slug', current: c.slug},
      portrait: {_type: 'imageWithAlt', asset: await uploadImage(c.file), alt: c.alt},
      sortOrder: c.sortOrder,
    })
    console.log(`+ collab ${c.artistName}`)
  }
}

async function seedAboutFourthImage() {
  // La foto FRENZ + INOKI, quarta nell'About originale: aggiunta se manca.
  const page = await client.fetch<{_id: string; keys: string[]} | null>(
    `*[_type == "page" && slug.current == "about"][0]{_id, "keys": images[]._key}`,
  )
  if (!page || page.keys?.includes('a4')) return
  await client
    .patch(page._id)
    .setIfMissing({images: []})
    .append('images', [await img('about-inoki.webp', 'FRENZ e INOKI', 'a4')])
    .commit()
  console.log('+ quarta foto About')
}

async function seedTestProduct(categoryIds: Record<string, string>) {
  const exists = await client.fetch<boolean>(
    `defined(*[_type == "product" && slug.current == "prodotto-di-test"][0]._id)`,
  )
  if (exists) return
  await client.create({
    _type: 'product',
    title: 'Prodotto di test',
    slug: {_type: 'slug', current: 'prodotto-di-test'},
    category: {_type: 'reference', _ref: categoryIds.bracciali},
    price: 6000,
    productionType: 'pezzoUnico',
    stock: 1,
    isAvailable: true,
    isPersonalizable: true,
    featured: true,
    sortOrder: 999,
    material: 'Argento 925',
    shortDescription: 'Prodotto di prova per verificare shop e checkout. Da eliminare prima del go-live.',
    images: [
      {
        _key: 'cover',
        _type: 'imageWithAlt',
        asset: await uploadImage('test-product.webp'),
        alt: 'Bracciale e anello FRENZ in argento indossati',
      },
    ],
  })
  console.log('+ prodotto di test')
}

const categoryIds = await seedCategories()
await seedSettings()
await seedAboutPage()
await seedAboutFourthImage()
await seedCollabs()
await seedTestProduct(categoryIds)
console.log('Seed completato.')
