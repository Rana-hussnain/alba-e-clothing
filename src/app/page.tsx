'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KIDS_LIST, MEN_LIST, resolveEntry, type GridFilter } from '@/lib/catalog'
import type { Order, Product } from '@/lib/shop'
import { AnnouncementBar, Header } from '@/components/store/header'
import { ChatButton } from '@/components/store/chat-button'
import { Hero } from '@/components/store/hero'
import { ProductGrid } from '@/components/store/product-grid'
import { ProductDetail } from '@/components/store/product-detail'
import { Checkout } from '@/components/store/checkout'
import { OrderSuccess } from '@/components/store/order-success'
import { CartDrawer } from '@/components/store/cart-drawer'
import { HowToOrder } from '@/components/store/how-to-order'
import { SearchOverlay } from '@/components/store/search-overlay'
import { WishlistDrawer } from '@/components/store/wishlist-drawer'
import { FAQ, Newsletter, Testimonials } from '@/components/store/home-extras'
import { Footer } from '@/components/store/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthSheet } from '@/components/store/auth-sheet'
import { MyOrders } from '@/components/store/my-orders'
import { useCustomer } from '@/lib/customer-store'
import { toast } from 'sonner'

type View = 'home' | 'product' | 'checkout' | 'success' | 'orders'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('home')
  const [filter, setFilter] = useState<GridFilter>({ category: 'all', entry: null })
  const [selected, setSelected] = useState<Product | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const { fetchMe, openAuth } = useCustomer()

  const gridRef = useRef<HTMLElement | null>(null)
  const infoRef = useRef<HTMLElement | null>(null)

  // Load catalog from the API
  useEffect(() => {
    let active = true
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (active) setProducts(data.products ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Session + email-link landings (?verified=1|0, ?reset=<token>)
  useEffect(() => {
    fetchMe()
    const params = new URLSearchParams(window.location.search)
    const verified = params.get('verified')
    const reset = params.get('reset')
    if (verified === '1') {
      toast.success('Email verified — you can now place orders')
      fetchMe()
    } else if (verified === '0') {
      toast.error('That verification link is invalid or has expired. Request a new one from checkout.')
    }
    if (reset) openAuth('reset', reset)
    if (verified || reset) window.history.replaceState({}, '', '/')
  }, [fetchMe, openAuth])

  // Reset scroll on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  const scrollToGrid = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      )
    )
  }, [])

  const scrollToInfo = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      )
    )
  }, [])

  const goHome = useCallback(() => {
    setView('home')
    setSelected(null)
  }, [])

  const navCategory = useCallback(
    (category: 'kids' | 'men') => {
      setView('home')
      setSelected(null)
      setFilter({ category, entry: null })
      scrollToGrid()
    },
    [scrollToGrid]
  )

  const navAll = useCallback(() => {
    setView('home')
    setSelected(null)
    setFilter({ category: 'all', entry: null })
    scrollToGrid()
  }, [scrollToGrid])

  const pickEntry = useCallback(
    (category: 'kids' | 'men', entryLabel: string) => {
      const list = category === 'kids' ? KIDS_LIST : MEN_LIST
      const entry = resolveEntry(list, entryLabel)
      setView('home')
      setSelected(null)
      setFilter({ category, entry })
      scrollToGrid()
    },
    [scrollToGrid]
  )

  const openProduct = useCallback((product: Product) => {
    setSelected(product)
    setView('product')
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header
        onNavHome={goHome}
        onNavCategory={navCategory}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenOrders={() => setView('orders')}
      />

      <main className="flex-1">
        {view === 'home' && (
          <>
            <Hero onShopMen={() => navCategory('men')} onShopKids={() => navCategory('kids')} />
            <div ref={gridRef as React.RefObject<HTMLDivElement>}>
              {loading ? (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                  <Skeleton className="h-8 w-48 mb-8" />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="aspect-[3/4] w-full" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <ProductGrid
                  products={products}
                  filter={filter}
                  onFilterChange={setFilter}
                  onOpenProduct={openProduct}
                  gridRef={gridRef}
                />
              )}
            </div>
            <div ref={infoRef as React.RefObject<HTMLDivElement>}>
              <HowToOrder onPickCategory={navCategory} onPickEntry={pickEntry} />
            </div>
            <Testimonials />
            <FAQ />
            <Newsletter />
          </>
        )}

        {view === 'product' && selected && (
          <ProductDetail
            product={selected}
            products={products}
            onBack={goHome}
            onCheckout={() => setView('checkout')}
            onOpenProduct={openProduct}
          />
        )}

        {view === 'checkout' && (
          <Checkout onBack={goHome} onSuccess={(o) => { setOrder(o); setView('success') }} />
        )}

        {view === 'orders' && (
          <MyOrders
            onBack={goHome}
            onOpen={(o) => { setOrder(o); setView('success') }}
          />
        )}

        {view === 'success' && order && (
          <OrderSuccess order={order} onContinue={goHome} />
        )}
      </main>

      <Footer
        onNavHome={goHome}
        onNavCategory={navCategory}
        onNavAll={navAll}
        onNavInfo={() => {
          setView('home')
          setSelected(null)
          scrollToInfo()
        }}
      />

      <CartDrawer onCheckout={() => setView('checkout')} />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        onOpenProduct={openProduct}
      />
      <WishlistDrawer products={products} onOpenProduct={openProduct} />

      <AuthSheet />
      <ChatButton />
    </div>
  )
}
