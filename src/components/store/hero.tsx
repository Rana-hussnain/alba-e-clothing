'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

interface HeroProps {
  onShopMen: () => void
  onShopKids: () => void
}

export function Hero({ onShopMen, onShopKids }: HeroProps) {
  return (
    <section className="relative w-full h-[440px] sm:h-[520px] overflow-hidden bg-secondary" aria-label="Summer collection hero">
      <Image
        src="/products/hero-summer.png"
        alt="Men summer outfits campaign"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
            ALBA-E — Summer Outfits 2026
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight leading-[1.08] mb-5">
            Crisp looks for
            <br />
            sunny days
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-md">
            Easy cottons, tailored trousers and everyday denim for men and kids.
            Pay the full amount with JazzCash — once your payment is verified,
            your parcel is on its way.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onShopMen}
              className="h-12 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
            >
              Shop Men
            </button>
            <button
              onClick={onShopKids}
              className="h-12 px-8 border border-primary/30 bg-background/60 text-xs font-semibold tracking-[0.18em] uppercase hover:bg-background transition-colors"
            >
              Shop Kids
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
