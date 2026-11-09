'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronLeft, Heart, Minus, Plus, ShieldCheck, Truck, RotateCcw } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatPKR, parseJsonArray, calcPayment, type Product } from '@/lib/shop'
import { useCart } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ProductReviews } from './product-reviews'
import { Stars } from './stars'
import { ProductCard } from './product-card'
import { toast } from 'sonner'
import { WhatsAppIcon } from './whatsapp-icon'
import { productWhatsAppLink } from '@/lib/contact'

interface ProductDetailProps {
  product: Product
  products: Product[]
  onBack: () => void
  onCheckout: () => void
  onOpenProduct: (product: Product) => void
}

/* Size guide data — inches for men, age/height for kids */
const MEN_SIZE_GUIDE = [
  { size: 'S', chest: '36–38', length: '26' },
  { size: 'M', chest: '38–40', length: '27' },
  { size: 'L', chest: '40–42', length: '28' },
  { size: 'XL', chest: '42–44', length: '29' },
  { size: 'XXL', chest: '44–46', length: '30' },
]
const KIDS_SIZE_GUIDE = [
  { size: '2-3Y', age: '2–3 yrs', height: '92–98 cm' },
  { size: '3-4Y', age: '3–4 yrs', height: '98–104 cm' },
  { size: '5-6Y', age: '5–6 yrs', height: '110–116 cm' },
  { size: '7-8Y', age: '7–8 yrs', height: '122–128 cm' },
  { size: '9-10Y', age: '9–10 yrs', height: '134–140 cm' },
]

export function ProductDetail({ product, products, onBack, onCheckout, onOpenProduct }: ProductDetailProps) {
  const sizes = parseJsonArray(product.sizes)
  const colors = parseJsonArray(product.colors)
  const [size, setSize] = useState<string>(sizes[0] ?? 'Standard')
  const [color, setColor] = useState<string>(colors[0] ?? 'Default')
  const [qty, setQty] = useState(1)
  const soldOut = product.stock === 0
  const maxQty = Math.min(20, product.stock ?? 20)
  const { addItem, wishlist, toggleWishlist, setOpen } = useCart()

  const payment = calcPayment(product.price * qty)
  const wished = wishlist.includes(product.id)

  // Related: same category first (prefer same subtype), exclude current, max 4
  const related = useMemo(() => {
    const others = products.filter((p) => p.id !== product.id)
    const sameCat = others.filter((p) => p.category === product.category)
    const sameType = sameCat.filter((p) => p.subtype === product.subtype)
    const merged = [...sameType, ...sameCat.filter((p) => p.subtype !== product.subtype)]
    const rest = others.filter((p) => p.category !== product.category)
    return [...merged, ...rest].slice(0, 4)
  }, [products, product])

  const sizeGuide = product.category === 'kids' ? KIDS_SIZE_GUIDE : MEN_SIZE_GUIDE

  const handleAdd = (goCheckout: boolean) => {
    if (soldOut) return
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      price: product.price,
      size,
      qty,
    })
    if (goCheckout) {
      onCheckout()
    } else {
      setOpen(true)
      toast.success('Added to cart', { description: `${product.name} — ${size}` })
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" aria-label="Product details">
      {/* Breadcrumb / back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground hover:text-primary transition-colors mb-6"
        aria-label="Back to catalog"
      >
        <ChevronLeft className="h-4 w-4" />
        {product.category === 'kids' ? 'Kids' : 'Men'} — {product.subtype}
      </button>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-[#f4f3f1] overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-28 self-start">
          <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-2">
            {product.category === 'kids' ? "Kids' Products" : "Men's Products"} — {product.subtype}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight leading-tight mb-3">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-lg font-semibold">{formatPKR(product.price)}</p>
            {!!product.ratingCount && (
              <>
                <span className="h-4 w-px bg-border" aria-hidden />
                <Stars value={product.ratingAverage ?? 0} count={product.ratingCount} size={13} />
              </>
            )}
          </div>
          {typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs font-semibold text-amber-700 mb-3">Only {product.stock} left</p>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed mb-7">{product.description}</p>

          {/* Colors */}
          {colors.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2.5">
                Colour <span className="text-muted-foreground font-normal normal-case tracking-normal">— {color}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-9 px-4 text-[11px] font-medium tracking-[0.12em] uppercase border transition-colors',
                      color === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2.5">
                Size <span className="text-muted-foreground font-normal normal-case tracking-normal">— {size}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      'h-9 min-w-11 px-3 text-[12px] font-medium border transition-colors',
                      size === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="mb-7">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2.5">Quantity</p>
            <div className="inline-flex items-center border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-10 w-10 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="h-10 w-10 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              onClick={() => handleAdd(false)}
              disabled={soldOut}
              className="flex-1 h-12 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {soldOut ? 'Sold out' : 'Add to Cart'}
            </button>
            <button
              onClick={() => handleAdd(true)}
              disabled={soldOut}
              className="flex-1 h-12 border border-primary/30 text-xs font-semibold tracking-[0.18em] uppercase hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now — JazzCash
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="h-12 w-12 shrink-0 border border-border flex items-center justify-center hover:border-primary transition-colors"
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={cn('h-5 w-5', wished && 'fill-primary text-primary')} strokeWidth={1.5} />
            </button>
          </div>

          {/* WhatsApp enquiry */}
          <a
            href={productWhatsAppLink({
              name: product.name,
              price: product.price,
              size,
              pageUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex h-12 items-center justify-center gap-2.5 bg-[#25D366] text-white text-xs font-semibold tracking-[0.18em] uppercase hover:bg-[#1ebe5a] transition-colors"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Chat on WhatsApp about this item
          </a>

          {/* Price & payment + policies */}
          <Accordion type="multiple" defaultValue={['payment']} className="border-t border-border">
            <AccordionItem value="payment" className="border-b border-border">
              <AccordionTrigger className="text-[11px] font-semibold tracking-[0.18em] uppercase hover:no-underline">
                Price &amp; Payment
              </AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Product Price ({qty} item{qty > 1 ? 's' : ''})</dt>
                    <dd className="font-medium">{formatPKR(payment.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping Charges</dt>
                    <dd className="font-medium">{formatPKR(payment.shippingCharges)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <dt className="font-semibold">Total — Paid in Full</dt>
                    <dd className="font-semibold">{formatPKR(payment.totalPayable)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  Sign in, send the total to our JazzCash account, then enter your
                  delivery details and the JazzCash TID at checkout. We cross-check the TID
                  and dispatch. No cash on delivery.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery" className="border-b border-border">
              <AccordionTrigger className="text-[11px] font-semibold tracking-[0.18em] uppercase hover:no-underline">
                Delivery Information
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We deliver nationwide with a flat shipping charge of {formatPKR(300)}.
                  At checkout you provide your first name, last name, full address, city,
                  contact number and postal code, plus your JazzCash TID. You must be signed in to order. Our courier calls
                  you before delivery, so please keep your contact number reachable.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns" className="border-b border-border">
              <AccordionTrigger className="text-[11px] font-semibold tracking-[0.18em] uppercase hover:no-underline">
                Return Policy
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Return is available within 3 days only. To be eligible, items must be
                  unworn, unwashed and in their original packaging with tags attached.
                  Contact us within 3 days of receiving your order to arrange a return.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="size-guide" className="border-b border-border">
              <AccordionTrigger className="text-[11px] font-semibold tracking-[0.18em] uppercase hover:no-underline">
                Size Guide
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {product.category === 'kids'
                    ? 'Kids sizes are based on age and height. When between sizes, pick the larger one for growing room.'
                    : 'Men sizes are based on chest circumference (inches). When between sizes, size up for a relaxed fit.'}
                </p>
                <table className="w-full text-xs border border-border">
                  <caption className="sr-only">Size guide table</caption>
                  <thead>
                    <tr className="bg-secondary/60 text-left">
                      <th scope="col" className="px-3 py-2 font-semibold tracking-[0.1em] uppercase">Size</th>
                      {product.category === 'kids' ? (
                        <>
                          <th scope="col" className="px-3 py-2 font-semibold tracking-[0.1em] uppercase">Age</th>
                          <th scope="col" className="px-3 py-2 font-semibold tracking-[0.1em] uppercase">Height</th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="px-3 py-2 font-semibold tracking-[0.1em] uppercase">Chest (in)</th>
                          <th scope="col" className="px-3 py-2 font-semibold tracking-[0.1em] uppercase">Length (in)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuide.map((row) => (
                      <tr key={row.size} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold">{row.size}</td>
                        {product.category === 'kids' ? (
                          <>
                            <td className="px-3 py-2 text-muted-foreground">{row.age}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.height}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-muted-foreground">{row.chest}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.length}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: Truck, label: 'Nationwide Delivery' },
              { icon: ShieldCheck, label: 'Verified JazzCash Payment' },
              { icon: RotateCcw, label: '3-Day Return' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 py-4 bg-secondary/60 text-center">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Customer reviews — real, from verified buyers */}
          <ProductReviews productId={product.id} />
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-14 sm:mt-20 border-t border-border pt-10 sm:pt-14" aria-label="You may also like">
          <div className="mb-8">
            <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
              Complete the Look
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight">
              You May Also Like
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} onOpen={onOpenProduct} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
