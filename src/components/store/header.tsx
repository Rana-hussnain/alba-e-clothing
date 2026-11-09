'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardList, Heart, LogOut, Search, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/store'
import { useCustomer } from '@/lib/customer-store'

const MESSAGES = [
  'Sign in → pay via JazzCash → enter TID',
  'Pay the full amount with JazzCash',
  'Shipping Charges: PKR 300 flat',
  'Return available within 3 days only',
  'Summer Outfits 2026 — Kids & Men',
]

export function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-[#d9a856] text-black h-9 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-[11px] tracking-[0.18em] uppercase font-semibold px-4 text-center"
        >
          {MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

interface HeaderProps {
  onNavHome: () => void
  onNavCategory: (category: 'kids' | 'men') => void
  onOpenSearch: () => void
  onOpenOrders: () => void
}

export function Header({ onNavHome, onNavCategory, onOpenSearch, onOpenOrders }: HeaderProps) {
  const { items, wishlist, setOpen, setWishOpen } = useCart()
  const { customer, openAuth, logout } = useCustomer()
  const [menuOpen, setMenuOpen] = useState(false)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={onNavHome}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="ALBA-E — Home"
          >
            <span className="relative h-11 w-11 overflow-hidden shrink-0" aria-hidden>
              <Image
                src="/logo-mark.png"
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-[0.22em] uppercase">
              ALBA-E
            </span>
          </button>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <button
              onClick={() => onNavCategory('kids')}
              className="text-xs font-medium tracking-[0.18em] uppercase transition-colors hover:text-[#d9a856]"
            >
              Kids
            </button>
            <button
              onClick={() => onNavCategory('men')}
              className="text-xs font-medium tracking-[0.18em] uppercase transition-colors hover:text-[#d9a856]"
            >
              Men
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="relative">
              <button
                onClick={() => (customer ? setMenuOpen((o) => !o) : openAuth('login'))}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label={customer ? 'Account menu' : 'Sign in'}
                aria-expanded={customer ? menuOpen : undefined}
              >
                <User className="h-5 w-5" strokeWidth={1.5} />
                {customer && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
              {customer && menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-background text-foreground border border-border shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold truncate">{customer.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{customer.email}</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); onOpenOrders() }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.12em] uppercase hover:bg-muted text-left"
                    >
                      <ClipboardList className="h-4 w-4" /> My Orders
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); logout() }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.12em] uppercase hover:bg-muted text-left border-t border-border"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setWishOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={`Open wishlist, ${wishlist.length} items`}
            >
              <Heart className="h-5 w-5" strokeWidth={1.5} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-[#d9a856] text-black text-[10px] font-semibold flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={`Open cart, ${count} items`}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-[#d9a856] text-black text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          className="md:hidden flex items-center gap-6 pb-3 overflow-x-auto"
          aria-label="Mobile navigation"
        >
          <button
            onClick={() => onNavCategory('kids')}
            className="text-[11px] font-medium tracking-[0.18em] uppercase whitespace-nowrap transition-colors hover:text-[#d9a856]"
          >
            Kids
          </button>
          <button
            onClick={() => onNavCategory('men')}
            className="text-[11px] font-medium tracking-[0.18em] uppercase whitespace-nowrap transition-colors hover:text-[#d9a856]"
          >
            Men
          </button>
        </nav>
      </div>
    </header>
  )
}
