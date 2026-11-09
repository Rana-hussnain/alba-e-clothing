'use client'

import Image from 'next/image'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatPKR, calcPayment } from '@/lib/shop'
import { useCart } from '@/lib/store'

export function CartDrawer({ onCheckout }: { onCheckout: () => void }) {
  const { items, isOpen, setOpen, updateQty, removeItem } = useCart()
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const payment = calcPayment(subtotal)

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <span className="hidden" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            Your Cart ({items.reduce((s, i) => s + i.qty, 0)})
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Shipping charges {formatPKR(300)} — JazzCash full payment
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" strokeWidth={1} />
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Your cart is empty
            </p>
            <button
              onClick={() => setOpen(false)}
              className="h-11 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-4"
                >
                  <div className="relative h-24 w-[72px] shrink-0 bg-[#f4f3f1] overflow-hidden">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="72px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                          {item.category === 'kids' ? 'Kids' : 'Men'} — Size {item.size}
                        </p>
                        <h4 className="text-[13px] font-medium uppercase tracking-wide leading-snug mt-0.5 truncate">
                          {item.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.size)}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="inline-flex items-center border border-border">
                        <button
                          onClick={() => updateQty(item.productId, item.size, item.qty - 1)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-secondary"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.size, item.qty + 1)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-secondary"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold">{formatPKR(item.price * item.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SheetFooter className="px-5 py-4 border-t border-border block space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product Price</span>
                <span className="font-medium">{formatPKR(payment.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Charges</span>
                <span className="font-medium">{formatPKR(payment.shippingCharges)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-3">
                <span>Total — Paid in Full</span>
                <span>{formatPKR(payment.totalPayable)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pay the full amount with JazzCash after placing the order — we verify your
                payment and dispatch. No cash on delivery.
              </p>
              <button
                onClick={() => {
                  setOpen(false)
                  onCheckout()
                }}
                className="w-full h-12 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
              >
                Proceed to Checkout
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
