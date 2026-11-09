'use client'

import Image from 'next/image'
import { Phone, Mail, MapPin, MessageCircle, Truck, RotateCcw, Smartphone } from 'lucide-react'
import {
  COMPANY_EMAIL,
  COMPANY_PHONE_LABEL,
  COMPANY_PHONE_ALT_LABEL,
  MAILTO_LINK,
  TEL_LINK,
  TEL_LINK_ALT,
  WHATSAPP_LINK,
} from '@/lib/contact'

interface FooterProps {
  onNavHome: () => void
  onNavCategory: (category: 'kids' | 'men') => void
  onNavAll: () => void
  onNavInfo: () => void
}

export function Footer({ onNavHome, onNavCategory, onNavAll, onNavInfo }: FooterProps) {
  return (
    <footer className="mt-auto bg-primary text-primary-foreground" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="relative w-56 h-[150px] border border-primary-foreground/15 bg-black/40 p-2 mb-4">
              <Image
                src="/logo-albae.png"
                alt="ALBA-E Clothing — Style Takes Flight"
                fill
                sizes="224px"
                className="object-contain"
              />
            </div>
            <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-primary-foreground/70 mb-4">
              Style Takes Flight
            </p>
            <p className="text-xs leading-relaxed text-primary-foreground/70 max-w-xs">
              Summer outfits 2026 for kids and men. Everyday cottons, tailored trousers
              and denim — dispatched nationwide after quick, verified JazzCash payment.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[10px] font-medium tracking-[0.14em] uppercase text-primary-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> JazzCash Full Payment
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> PKR 300 Shipping
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> 3-Day Return
              </span>
            </div>
          </div>

          {/* Shop */}
          <nav aria-label="Footer shop links">
            <h3 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 text-primary-foreground/60">
              Shop
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavCategory('men')} className="hover:underline underline-offset-4 text-primary-foreground/85 hover:text-primary-foreground transition-colors">
                  Men&apos;s Products
                </button>
              </li>
              <li>
                <button onClick={() => onNavCategory('kids')} className="hover:underline underline-offset-4 text-primary-foreground/85 hover:text-primary-foreground transition-colors">
                  Kids&apos; Products
                </button>
              </li>
              <li>
                <button onClick={onNavAll} className="hover:underline underline-offset-4 text-primary-foreground/85 hover:text-primary-foreground transition-colors">
                  All Products
                </button>
              </li>
              <li>
                <button onClick={onNavInfo} className="hover:underline underline-offset-4 text-primary-foreground/85 hover:text-primary-foreground transition-colors">
                  How to Order
                </button>
              </li>
            </ul>
          </nav>

          {/* Policies */}
          <nav aria-label="Footer policy links">
            <h3 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 text-primary-foreground/60">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-sm text-primary-foreground/85">
              <li>Delivery across Pakistan</li>
              <li>Shipping Charges: PKR 300 flat</li>
              <li>Full payment before dispatch</li>
              <li>Return within 3 days only</li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 text-primary-foreground/60">
              Contact
            </h3>
            <ul className="space-y-2.5 text-sm text-primary-foreground/85">
              <li>
                <a
                  href={TEL_LINK}
                  className="flex items-center gap-2 hover:text-primary-foreground transition-colors w-fit"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {COMPANY_PHONE_LABEL}
                </a>
              </li>
              <li>
                <a
                  href={TEL_LINK_ALT}
                  className="flex items-center gap-2 hover:text-primary-foreground transition-colors w-fit"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {COMPANY_PHONE_ALT_LABEL}
                  <span className="text-primary-foreground/50 text-xs">(alternate)</span>
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary-foreground transition-colors w-fit"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" /> WhatsApp us
                </a>
              </li>
              <li>
                <a
                  href={MAILTO_LINK}
                  className="flex items-center gap-2 hover:text-primary-foreground transition-colors w-fit break-all"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {COMPANY_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Serving all cities — Lahore, Karachi, Islamabad &amp; more</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.14em] uppercase text-primary-foreground/60">
            © 2026 ALBA-E — All rights reserved
          </p>
          <p className="text-[11px] tracking-[0.14em] uppercase text-primary-foreground/60">
            JazzCash Full Payment · Shipping PKR 300 · 3-Day Returns
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Legal">
            {[
              ['/privacy', 'Privacy'],
              ['/terms', 'Terms'],
              ['/returns', 'Returns & Refunds'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[10px] tracking-[0.14em] uppercase text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="/admin"
            className="text-[10px] tracking-[0.14em] uppercase text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
            aria-label="Store owner login"
          >
            Store Owner
          </a>
        </div>
      </div>
    </footer>
  )
}
