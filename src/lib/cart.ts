/**
 * Carrello lato client, persistito in localStorage. Nessun framework: un modulo
 * con stato + evento `cart:change` a cui si agganciano header e drawer.
 * I prezzi qui servono solo per il riepilogo: al checkout vengono ricalcolati dal server.
 */
export interface CartItem {
  id: string
  slug: string
  title: string
  price: number // centesimi
  image?: string
  max: number
  qty: number
}

const KEY = 'frenz-cart'
const EVENT = 'cart:change'

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    const items = raw ? (JSON.parse(raw) as CartItem[]) : []
    return Array.isArray(items) ? items.filter((i) => i && i.id && i.qty > 0) : []
  } catch {
    return []
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage pieno o bloccato: il carrello vive solo in memoria */
  }
  window.dispatchEvent(new CustomEvent(EVENT, {detail: items}))
}

export const cart = {
  get: read,

  count: () => read().reduce((n, i) => n + i.qty, 0),

  subtotal: () => read().reduce((n, i) => n + i.qty * i.price, 0),

  add(item: Omit<CartItem, 'qty'>, qty = 1) {
    const items = read()
    const existing = items.find((i) => i.id === item.id)
    if (existing) existing.qty = Math.min(existing.qty + qty, existing.max)
    else items.push({...item, qty: Math.min(qty, item.max)})
    write(items)
  },

  setQty(id: string, qty: number) {
    const items = read()
    const item = items.find((i) => i.id === id)
    if (!item) return
    item.qty = Math.min(Math.max(0, Math.round(qty)), item.max)
    write(items.filter((i) => i.qty > 0))
  },

  remove(id: string) {
    write(read().filter((i) => i.id !== id))
  },

  clear() {
    write([])
  },

  onChange(fn: (items: CartItem[]) => void) {
    window.addEventListener(EVENT, (e) => fn((e as CustomEvent<CartItem[]>).detail))
    // Sincronizza tra tab: localStorage cambia in un'altra finestra
    window.addEventListener('storage', (e) => e.key === KEY && fn(read()))
  },
}

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR'}).format(cents / 100)
