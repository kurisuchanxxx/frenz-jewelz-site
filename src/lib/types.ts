import type {PortableTextBlock} from '@portabletext/types'

export type ProductionType = 'pezzoUnico' | 'piccolaSerie' | 'suOrdinazione'

export interface SanityImage {
  _key?: string
  asset: {_ref: string} | {_id: string}
  alt: string
  hotspot?: {x: number; y: number; width: number; height: number}
  crop?: {top: number; bottom: number; left: number; right: number}
}

export interface Category {
  _id: string
  title: string
  slug: string
}

export interface ProductCard {
  _id: string
  title: string
  slug: string
  price: number
  compareAtPrice?: number
  image?: SanityImage
  category?: Category
  productionType: ProductionType
  stock?: number
  isAvailable?: boolean
}

export interface Product extends ProductCard {
  images: SanityImage[]
  lifestyleImages?: SanityImage[]
  shortDescription?: string
  description?: PortableTextBlock[]
  material?: string
  details?: {dimensions?: string; chainLength?: string; weight?: string; finish?: string}
  leadTimeDays?: number
  isPersonalizable?: boolean
  collab?: {artistName: string; slug: string}
  seo?: {metaTitle?: string; metaDescription?: string}
}

export interface SiteSettings {
  heroImage?: SanityImage
  heroHeadline?: string
  heroSubline?: string
  lookbookImages?: SanityImage[]
  announcementBar?: string
  instagramUrl?: string
  facebookUrl?: string
  contactEmail?: string
}
