import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/lib/shop'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  wishlist: string[] // product ids
  isWishOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (productId: string, size: string) => void
  updateQty: (productId: string, size: string, qty: number) => void
  clear: () => void
  setOpen: (open: boolean) => void
  setWishOpen: (open: boolean) => void
  toggleWishlist: (id: string) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      isWishOpen: false,
      wishlist: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.size === item.size
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, qty: Math.min(20, i.qty + item.qty) }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (productId, size) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        })),
      updateQty: (productId, size, qty) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && i.size === size
                ? { ...i, qty: Math.max(0, Math.min(20, qty)) }
                : i
            )
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ isOpen: open }),
      setWishOpen: (open) => set({ isWishOpen: open }),
      toggleWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.includes(id)
            ? state.wishlist.filter((w) => w !== id)
            : [...state.wishlist, id],
        })),
    }),
    {
      name: 'collection-cart',
      partialize: (s) => ({ items: s.items, wishlist: s.wishlist }),
    }
  )
)
