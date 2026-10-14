/**
 * Misure di Nemico Pubblico e TicTac (ritirati, restano bozze) e testo guida "senza catena".
 *   node --env-file-if-exists=.env seed/update-2026-10b.ts
 */
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {createClient} from '@sanity/client'
import {DRAFT_PAGES} from './pages.ts'
import {textToBlocks} from './blocks.ts'

const {authToken} = JSON.parse(readFileSync(`${homedir()}/.config/sanity/config.json`, 'utf8')) as {authToken?: string}
const client = createClient({projectId: 'd2cmi1jx', dataset: 'production', apiVersion: '2026-09-01', token: authToken, useCdn: false, perspective: 'raw'})

const categoryId = await client.fetch<string>(`*[_type == "category" && slug.current == "ciondoli" && !(_id in path("drafts.**"))][0]._id`)
const DRAFTS = {
  'nemico-pubblico': {size: '4,3 × 2,0 cm', weight: '7 g'},
  tictac: {size: '4,9 × 1,4 cm', weight: '6,5 g'},
}
for (const [slug, d] of Object.entries(DRAFTS)) {
  const id = await client.fetch<string | null>(`*[_type == "product" && slug.current == $slug && _id in path("drafts.**")][0]._id`, {slug})
  if (!id) continue
  await client
    .patch(id)
    .set({
      productionType: 'pezzoUnico',
      stock: 1,
      category: {_type: 'reference', _ref: categoryId},
      'details.dimensions': d.size,
      'details.weight': d.weight,
    })
    .unset(['details.chainLength'])
    .commit()
  console.log(`~ ${slug} (${id})`)
}

const guida = DRAFT_PAGES.find((p) => p.slug === 'guida')!
const guidaId = await client.fetch<string>(`*[_type == "page" && slug.current == "guida" && !(_id in path("drafts.**"))][0]._id`)
await client.patch(guidaId).set({body: textToBlocks(guida.body)}).commit()
console.log('~ pagina guida')
