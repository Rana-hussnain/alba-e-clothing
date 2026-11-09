import type { Product } from '@/lib/shop'

/**
 * Catalog structure mirroring the store's official category list.
 * Each entry filters the product grid when clicked.
 */
export interface ListEntry {
  label: string
  sub?: string[]
  match: (p: Product) => boolean
}

export const KIDS_LIST: ListEntry[] = [
  { label: 'T-Shirts', match: (p) => p.subtype === 'T-Shirts' },
  { label: 'Trousers', match: (p) => p.subtype === 'Trousers' },
  { label: 'Cotton Pants', match: (p) => p.subtype === 'Cotton Pants' },
  { label: 'Jeans', sub: ['Baggy Jeans', 'Regular Jeans', 'Slim Fit Jeans'], match: (p) => p.subtype === 'Jeans' },
  { label: 'Cargo Trousers', match: (p) => p.subtype === 'Cargo Trousers' },
  { label: 'Casual Shirts', match: (p) => p.subtype === 'Casual Shirts' },
  { label: 'Sweatshirts', match: (p) => p.subtype === 'Sweatshirts' },
  { label: 'Hoodies', match: (p) => p.subtype === 'Hoodies' },
  { label: 'Baggy Trousers', match: (p) => p.subtype === 'Baggy Trousers' },
]

export const MEN_LIST: ListEntry[] = [
  { label: 'T-Shirts', match: (p) => p.subtype === 'T-Shirts' },
  { label: 'Trousers', match: (p) => p.subtype === 'Trousers' },
  { label: 'Cotton Pants', match: (p) => p.subtype === 'Cotton Pants' },
  { label: 'Jeans', sub: ['Baggy Jeans', 'Regular Jeans', 'Slim Fit Jeans'], match: (p) => p.subtype === 'Jeans' },
  { label: 'Cargo Trousers', match: (p) => p.subtype === 'Cargo Trousers' },
  { label: 'Casual Shirts', match: (p) => p.subtype === 'Casual Shirts' },
  { label: 'Sweatshirts', match: (p) => p.subtype === 'Sweatshirts' },
  { label: 'Hoodies', match: (p) => p.subtype === 'Hoodies' },
  { label: 'Leather Belts', match: (p) => p.subtype === 'Leather Belts' },
  { label: 'Baggy Trousers', match: (p) => p.subtype === 'Baggy Trousers' },
]

const JEANS_FITS: ListEntry[] = [
  { label: 'Baggy Jeans', match: (p) => p.subtype === 'Jeans' && /baggy/i.test(p.name) },
  { label: 'Regular Jeans', match: (p) => p.subtype === 'Jeans' && /regular/i.test(p.name) },
  { label: 'Slim Fit Jeans', match: (p) => p.subtype === 'Jeans' && /slim/i.test(p.name) },
]

/**
 * Resolve a list entry by label. Falls back to the jeans fit sub-entries so
 * sub-labels like "Baggy Jeans" resolve even though they are not top-level.
 */
export function resolveEntry(list: ListEntry[], label: string): ListEntry | null {
  const direct = list.find((e) => e.label === label)
  if (direct) return direct
  const isSub = list.some((e) => e.sub?.includes(label))
  return isSub ? (JEANS_FITS.find((j) => j.label === label) ?? null) : null
}

export interface GridFilter {
  category: 'all' | 'kids' | 'men'
  entry: ListEntry | null
}

export function applyFilter(products: Product[], filter: GridFilter): Product[] {
  return products.filter((p) => {
    if (filter.category !== 'all' && p.category !== filter.category) return false
    if (filter.entry && !filter.entry.match(p)) return false
    return true
  })
}
