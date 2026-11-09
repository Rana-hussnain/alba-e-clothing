'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { formatPKR, type Product } from '@/lib/shop'
import { useCart } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Stars } from './stars'

interface ProductCardProps {
  product: Product
  index?: number
  onOpen: (product: Product) => void
}

export function ProductCard({ product, index = 0, onOpen }: ProductCardProps) {
  const { wishlist, toggleWishlist } = useCart()
  const wished = wishlist.includes(product.id)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      className="group cursor-pointer"
      onClick={() => onOpen(product)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f4f3f1]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleWishlist(product.id)
          }}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart
            className={cn('h-4 w-4 transition-colors', wished ? 'fill-primary text-primary' : 'text-primary')}
            strokeWidth={1.5}
          />
        </button>
        {product.stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-background/90 text-center py-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
            Sold out
          </span>
        )}
        {product.featured && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[9px] font-semibold tracking-[0.16em] uppercase px-2.5 py-1.5">
            Popular
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-primary text-primary-foreground text-center py-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
          View Product
        </div>
      </div>

      <div className="pt-3 pb-1 px-0.5">
        <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">
          {product.category === 'kids' ? 'Kids' : 'Men'} — {product.subtype}
        </p>
        <h3 className="text-[13px] font-medium uppercase tracking-wide leading-snug mb-1.5 group-hover:underline underline-offset-4">
          {product.name}
        </h3>
        <p className="text-sm font-semibold mb-1">{formatPKR(product.price)}</p>
        {!!product.ratingCount && <Stars value={product.ratingAverage ?? 0} count={product.ratingCount} size={11} />}
      </div>
    </motion.article>
  )
}
