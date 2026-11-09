'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  KIDS_LIST,
  MEN_LIST,
  applyFilter,
  resolveEntry,
  type GridFilter,
  type ListEntry,
} from '@/lib/catalog'
import type { Product } from '@/lib/shop'
import { cn } from '@/lib/utils'
import { ProductCard } from './product-card'

interface ProductGridProps {
  products: Product[]
  filter: GridFilter
  onFilterChange: (filter: GridFilter) => void
  onOpenProduct: (product: Product) => void
  gridRef?: React.RefObject<HTMLElement | null>
}

const TABS: { key: GridFilter['category']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'kids', label: "Kids' Products" },
  { key: 'men', label: "Men's Products" },
]

export function ProductGrid({
  products,
  filter,
  onFilterChange,
  onOpenProduct,
  gridRef,
}: ProductGridProps) {
  const [expandedList, setExpandedList] = useState<'kids' | 'men' | null>(null)
  const list = filter.category === 'kids' ? KIDS_LIST : filter.category === 'men' ? MEN_LIST : null

  const visible = useMemo(() => applyFilter(products, filter), [products, filter])

  const pickEntry = (entry: ListEntry | null) => {
    onFilterChange({ ...filter, entry })
  }

  const setTab = (key: GridFilter['category']) => {
    onFilterChange({ category: key, entry: null })
    setExpandedList(null)
  }

  return (
    <section ref={gridRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20" aria-label="Product catalog">
      {/* Section heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
            ALBA-E Collection
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight">
            {filter.category === 'all' ? 'Everything' : filter.category === 'kids' ? "Kids' Products" : "Men's Products"}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-border" role="tablist" aria-label="Catalog categories">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filter.category === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-3 -mb-px text-xs font-medium tracking-[0.16em] uppercase transition-colors border-b-2',
                filter.category === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-primary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category list chips (mirrors the store's official list) */}
      {list && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {list.map((entry) => (
            <div key={entry.label} className="relative">
              <button
                onClick={() => {
                  if (entry.sub && filter.category !== 'all') {
                    setExpandedList(expandedList === (filter.category as 'kids' | 'men') ? null : (filter.category as 'kids' | 'men'))
                  }
                  pickEntry(filter.entry?.label === entry.label ? null : entry)
                }}
                className={cn(
                  'h-9 px-4 text-[11px] font-medium tracking-[0.14em] uppercase border transition-colors inline-flex items-center gap-1',
                  filter.entry?.label === entry.label
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary'
                )}
              >
                {entry.label}
                {entry.sub && <ChevronDown className="h-3 w-3" />}
              </button>
              {/* jeans sub-list */}
              {entry.sub && expandedList === (filter.category as 'kids' | 'men') && (
                <div className="absolute z-10 top-full mt-1 left-0 min-w-44 bg-background border border-border shadow-lg py-1">
                  {entry.sub.map((s) => {
                    const subEntry = resolveEntry(list, s)
                    if (!subEntry) return null
                    return (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation()
                          pickEntry(subEntry)
                          setExpandedList(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-[11px] tracking-[0.12em] uppercase hover:bg-secondary transition-colors"
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {filter.entry && (
            <button
              onClick={() => pickEntry(null)}
              className="h-9 px-3 text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              aria-label="Clear filter"
            >
              Clear <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onOpen={onOpenProduct} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            No products in this selection yet
          </p>
          <button
            onClick={() => setTab('all')}
            className="mt-4 h-11 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
          >
            Browse everything
          </button>
        </div>
      )}
    </section>
  )
}
