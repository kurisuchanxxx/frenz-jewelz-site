import {defineQuery} from 'groq'

const IMAGE = `{_key, asset, alt, hotspot, crop}`

const PRODUCT_CARD = `
  _id,
  title,
  "slug": slug.current,
  price,
  compareAtPrice,
  "image": images[0]${IMAGE},
  "category": category->{_id, title, "slug": slug.current},
  productionType,
  stock,
  isAvailable
`

export const SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{
  heroImages[]${IMAGE},
  heroHeadline,
  heroSubline,
  collabHeadline,
  collabSubline,
  lookbookImages[]${IMAGE},
  announcementBar,
  instagramUrl,
  facebookUrl,
  contactEmail
}`)

export const CATEGORIES_QUERY = defineQuery(`*[_type == "category" && defined(slug.current)]
  | order(sortOrder asc, title asc){_id, title, "slug": slug.current}`)

export const PRODUCTS_QUERY = defineQuery(`*[_type == "product" && defined(slug.current)]
  | order(sortOrder asc, _createdAt desc){${PRODUCT_CARD}}`)

export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[_type == "product" && defined(slug.current) && featured == true]
  | order(sortOrder asc)[0...8]{${PRODUCT_CARD}}`)

export const PRODUCT_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0]{
  ${PRODUCT_CARD},
  images[]${IMAGE},
  lifestyleImages[]${IMAGE},
  shortDescription,
  description,
  material,
  details,
  leadTimeDays,
  isPersonalizable,
  "collab": collab->{artistName, "slug": slug.current},
  seo
}`)

export const COLLABORATIONS_QUERY = defineQuery(`*[_type == "collaboration" && defined(slug.current)]
  | order(sortOrder asc){
  _id,
  artistName,
  "slug": slug.current,
  portrait${IMAGE},
  description,
  instagramUrl,
  "pieces": pieces[]->{${PRODUCT_CARD}}
}`)

export const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{
  title, "slug": slug.current, body, images[]${IMAGE}, seo
}`)
