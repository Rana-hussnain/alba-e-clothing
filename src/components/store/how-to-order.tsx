'use client'

import { Banknote, ChevronRight, MapPin, RotateCcw } from 'lucide-react'
import { KIDS_LIST, MEN_LIST } from '@/lib/catalog'
import { formatPKR } from '@/lib/shop'

interface HowToOrderProps {
  onPickCategory: (category: 'kids' | 'men') => void
  onPickEntry: (category: 'kids' | 'men', entryLabel: string) => void
}

const ADDRESS_FIELDS = [
  { label: 'First Name', required: true },
  { label: 'Last Name', required: true },
  { label: 'Address', required: true },
  { label: 'City', required: true },
  { label: 'Contact Number', required: true },
  { label: 'Postal Code', required: true },
  { label: 'JazzCash Sender Number', required: true },
  { label: 'JazzCash TID (Transaction ID)', required: true },
]

export function HowToOrder({ onPickCategory, onPickEntry }: HowToOrderProps) {
  const renderList = (category: 'kids' | 'men') => {
    const list = category === 'kids' ? KIDS_LIST : MEN_LIST
    return (
      <ul className="space-y-1" aria-label={category === 'kids' ? "Kids' product list" : "Men's product list"}>
        {list.map((entry) => (
          <li key={entry.label}>
            <button
              onClick={() => onPickEntry(category, entry.label)}
              className="group flex w-full items-center justify-between border-b border-border/70 py-2 text-left text-sm hover:border-primary/40 transition-colors"
            >
              <span className="font-medium uppercase tracking-wide group-hover:underline underline-offset-4">
                {entry.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
            {entry.sub && (
              <ol className="pl-4 py-1 space-y-1">
                {entry.sub.map((s, i) => (
                  <li key={s}>
                    <button
                      onClick={() => onPickEntry(category, s)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {i + 1}. {s}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section
      aria-label="How to order"
      className="border-t border-border bg-secondary/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
            Simple &amp; Secure
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-3">
            How to Order
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Order in three easy steps with JazzCash full payment across Pakistan. Pay the
            entire amount with JazzCash — once your payment is verified, we dispatch your
            parcel straight to your door.
          </p>
        </div>

        {/* Steps 1–3 */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-14">
          {/* 1. Delivery Address */}
          <article className="border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                1
              </span>
              <h3 className="text-sm font-bold tracking-[0.16em] uppercase flex items-center gap-2">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                Delivery Address
              </h3>
            </div>
            <ul className="space-y-2.5">
              {ADDRESS_FIELDS.map((f) => (
                <li key={f.label} className="flex items-center justify-between text-sm">
                  <span>{f.label}</span>
                  {f.required ? (
                    <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Required *
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-muted-foreground/70">
                      Optional
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </article>

          {/* 2. Price & Payment */}
          <article className="border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                2
              </span>
              <h3 className="text-sm font-bold tracking-[0.16em] uppercase flex items-center gap-2">
                <Banknote className="h-4 w-4" strokeWidth={1.5} />
                Price &amp; Payment
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center justify-between">
                <span>Product Price (PKR)</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Per item</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Shipping Charges</span>
                <span className="font-semibold">{formatPKR(300)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Payment</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">JazzCash — full amount</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed mt-5 pt-4 border-t border-border">
              Pay the <span className="font-semibold text-foreground">full amount</span> with{' '}
              <span className="font-semibold text-foreground">JazzCash</span> at checkout and submit your
              transaction ID — we verify the payment and dispatch your order. There is no cash on
              delivery: parcels leave only after the payment is confirmed.
            </p>
          </article>

          {/* 3. Return Policy */}
          <article className="border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                3
              </span>
              <h3 className="text-sm font-bold tracking-[0.16em] uppercase flex items-center gap-2">
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                Return Policy
              </h3>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide mb-2">
              Return is available within 3 days only
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Items must be unworn and unwashed, in their original packaging with tags
              attached. Contact us within 3 days of receiving your order with your order
              number and photos of the item to arrange a return.
            </p>
          </article>
        </div>

        {/* 4 & 5. Full product lists */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <article className="border border-border bg-background p-6">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase mb-1">
              4. Kids&apos; Products
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Tap any category to browse the collection
            </p>
            {renderList('kids')}
            <button
              onClick={() => onPickCategory('kids')}
              className="mt-5 h-11 w-full bg-primary text-primary-foreground text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
            >
              Shop All Kids&apos; Products
            </button>
          </article>

          <article className="border border-border bg-background p-6">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase mb-1">
              5. Men&apos;s Products
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Tap any category to browse the collection
            </p>
            {renderList('men')}
            <button
              onClick={() => onPickCategory('men')}
              className="mt-5 h-11 w-full bg-primary text-primary-foreground text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
            >
              Shop All Men&apos;s Products
            </button>
          </article>
        </div>
      </div>
    </section>
  )
}
