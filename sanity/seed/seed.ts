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

async function seedSettings() {
  const exists = await client.fetch<boolean>(`defined(*[_id == "siteSettings"][0]._id)`)
  if (exists) return
  await client.createIfNotExists({
    _id: 'siteSettings',
    _type: 'siteSettings',
    heroImage: {_type: 'imageWithAlt', asset: await uploadImage('hero.webp'), alt: 'Ragazzo con anello e collana FRENZ in argento'},
    heroHeadline: 'Argento fatto a mano ad Ancona',
    heroSubline: 'Pezzi unici e piccole serie in argento 925.',
    // DA CONFERMARE con FRENZ: corriere, prezzi e tempi (domanda aperta 2).
    shippingOptions: [
      {_key: 'standard', _type: 'shippingOption', label: 'Spedizione Italia', price: 690, minDays: 2, maxDays: 4},
    ],
    instagramUrl: 'https://www.instagram.com/',
  })
  console.log('+ impostazioni sito')
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
await seedTestProduct(categoryIds)
console.log('Seed completato.')
