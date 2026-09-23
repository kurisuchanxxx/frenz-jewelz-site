import type {ProductCard} from './types'

export type Availability = 'disponibile' | 'suOrdinazione' | 'esaurito' | 'nonInVendita'

/**
 * Stato di vendita di un prodotto. Unica fonte di verità: la usano card, pagina prodotto
 * e (in fase 3) l'endpoint di checkout, così sito e server non divergono.
 */
export function getAvailability(p: Pick<ProductCard, 'isAvailable' | 'productionType' | 'stock'>): Availability {
  if (p.isAvailable === false) return 'nonInVendita'
  if (p.productionType === 'suOrdinazione') return 'suOrdinazione'
  return (p.stock ?? 0) > 0 ? 'disponibile' : 'esaurito'
}

export const isPurchasable = (a: Availability) => a === 'disponibile' || a === 'suOrdinazione'

/** Quantità massima acquistabile in un ordine. */
export function maxQuantity(p: Pick<ProductCard, 'isAvailable' | 'productionType' | 'stock'>): number {
  const a = getAvailability(p)
  if (!isPurchasable(a)) return 0
  if (p.productionType === 'pezzoUnico') return 1
  if (p.productionType === 'suOrdinazione') return 5
  return Math.min(p.stock ?? 0, 5)
}
