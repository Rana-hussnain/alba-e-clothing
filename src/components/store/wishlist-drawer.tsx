'use client'

import Image from 'next/image'
import { Heart, ShoppingBag, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatPKR, parseJsonArray, type Product } from '@/lib/shop'
import { useCart } from '@/lib/store'
import { Stars } from './stars'
import { toast } from 'sonner'

interface WishlistDrawerProps {
  products: Product[]
  onOpenProduct: (product: Product) => void
}

export function WishlistDrawer({ products, onOpenProduct }: WishlistDrawerProps) {
  const { wishlist, isWishOpen, setWishOpen, toggleWishlist, addItem } = useCart()

  const saved = products.filter((p) => wishlist.includes(p.id))

  const moveToCart = (p: Product) => {
    const sizes = parseJsonArray(p.sizes)
    const size = sizes[0] ?? 'Standard'
    addItem({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      image: p.image,
      price: p.price,
      size,
      qty: 1,
    })
    toast.success('Moved to cart', { description: `${p.name} — ${size}` })
  }

  return (
    <Sheet open={isWishOpen} onOpenChange={setWishOpen}>
      <SheetTrigger asChild>
        <span className="hidden" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
            <Heart className="h-4 w-4" strokeWidth={1.5} />
            Wishlist ({saved.length})
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Saved items stay here on this device until you add them to the cart.
          </SheetDescription>
        </SheetHeader>

        {saved.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/40" strokeWidth={1} />
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Your wishlist is empty
            </p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Tap the heart on any product to save it here for later.
            </p>
            <button
              onClick={() => setWishOpen(false)}
              className="h-11 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {saved.map((p) => {
                return (
                  <div key={p.id} className="flex gap-4">
                    <button
                      onClick={() => {
                        setWishOpen(false)
                        onOpenProduct(p)
                      }}
                      className="relative h-28 w-[84px] shrink-0 bg-[#f4f3f1] overflow-hidden group"
                      aria-label={`View ${p.name}`}
                    >
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="84px"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                            {p.category === 'kids' ? 'Kids' : 'Men'} — {p.subtype}
                          </p>
                          <h4 className="text-[13px] font-medium uppercase tracking-wide leading-snug mt-0.5 truncate">
                            {p.name}
                          </h4>
                          <div className="mt-1">
                            {!!p.ratingCount && <Stars value={p.ratingAverage ?? 0} count={p.ratingCount} size={11} />}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleWishlist(p.id)}
                          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          aria-label={`Remove ${p.name} from wishlist`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <p className="text-sm font-semibold">{formatPKR(p.price)}</p>
                        <button
                          onClick={() => moveToCart(p)}
                          className="h-8 px-3.5 bg-primary text-primary-foreground text-[10px] font-semibold tracking-[0.14em] uppercase hover:bg-primary/85 transition-colors inline-flex items-center gap-1.5"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <SheetFooter className="px-5 py-4 border-t border-border block">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                JazzCash full payment — PKR 300 flat shipping, 3-day returns.
              </p>
              <button
                onClick={() => setWishOpen(false)}
                className="mt-3 w-full h-11 border border-primary/30 text-xs font-semibold tracking-[0.18em] uppercase hover:bg-secondary transition-colors"
              >
                Continue Shopping
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
