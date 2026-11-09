'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Search, X } from 'lucide-react'
import { formatPKR, type Product } from '@/lib/shop'

const POPULAR = ['T-Shirt', 'Jeans', 'Hoodie', 'Cargo', 'Shirt', 'Belt']

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
  products: Product[]
  onOpenProduct: (product: Product) => void
}

export function SearchOverlay({ open, onClose, products, onOpenProduct }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset query when reopened (state adjustment during render, per React docs)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) setQuery('')
  }

  // Focus + scroll lock + escape
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.subtype} ${p.category}`.toLowerCase()
        return q.split(/\s+/).every((word) => hay.includes(word))
      })
      .slice(0, 8)
  }, [query, products])

  const pick = (p: Product) => {
    onClose()
    onOpenProduct(p)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search products"
        >
          <div className="max-w-2xl mx-auto px-4 pt-16 sm:pt-24">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
                Search ALBA-E
              </p>
              <button
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 border-b-2 border-primary pb-3">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search t-shirts, jeans, hoodies…"
                className="flex-1 bg-transparent outline-none text-base sm:text-lg placeholder:text-muted-foreground/60"
                aria-label="Search products"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Popular searches */}
            {!query && (
              <div className="mt-6">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="h-9 px-4 border border-border text-[11px] font-medium tracking-[0.12em] uppercase hover:border-primary hover:text-primary transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {query && (
              <div className="mt-6 max-h-[55vh] overflow-y-auto" aria-live="polite">
                {results.length === 0 ? (
                  <div className="py-14 text-center">
                    <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1.25} />
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-1">
                      No matches for “{query}”
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try a shorter word, e.g. “jeans” or “hoodie”.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => pick(p)}
                          className="w-full flex items-center gap-4 py-3 text-left group hover:bg-secondary/50 transition-colors px-2 -mx-2"
                        >
                          <span className="relative h-16 w-12 shrink-0 bg-[#f4f3f1] overflow-hidden">
                            <Image
                              src={p.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[10px] tracking-[0.16em] uppercase text-muted-foreground mb-0.5">
                              {p.category === 'kids' ? 'Kids' : 'Men'} — {p.subtype}
                            </span>
                            <span className="block text-[13px] font-medium uppercase tracking-wide truncate group-hover:underline underline-offset-4">
                              {p.name}
                            </span>
                          </span>
                          <span className="text-sm font-semibold shrink-0">{formatPKR(p.price)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
