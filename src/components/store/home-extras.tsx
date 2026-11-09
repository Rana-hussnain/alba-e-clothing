'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Mail, MessageCircle, Quote } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Stars } from './stars'
import { toast } from 'sonner'

/* =================== Testimonials =================== */

interface PublicReview {
  name: string
  city: string
  rating: number
  comment: string
}

export function Testimonials() {
  // Real, owner-approved reviews from verified buyers. Nothing is shown until there are some.
  const [reviews, setReviews] = useState<PublicReview[]>([])
  useEffect(() => {
    let active = true
    fetch('/api/reviews?limit=3', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => active && setReviews(d.reviews ?? []))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (reviews.length === 0) return null

  return (
    <section aria-label="Customer testimonials" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
            Verified Buyers
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-3">
            What Customers Say
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Real feedback from customers who received their order.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {reviews.map((t, i) => (
            <motion.figure
              key={`${t.name}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
              className="border border-border bg-card p-6 flex flex-col"
            >
              <Quote className="h-5 w-5 text-primary/40 mb-4" strokeWidth={1.5} aria-hidden />
              <Stars value={t.rating} size={13} className="mb-3" />
              <blockquote className="text-sm leading-relaxed text-muted-foreground flex-1">
                “{t.comment}”
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border text-xs">
                <span className="font-semibold uppercase tracking-[0.12em]">{t.name}</span>
                <span className="text-muted-foreground"> — {t.city}</span>
                <span className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  Verified Buyer
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =================== FAQ =================== */

const FAQS = [
  {
    q: 'How do I pay for my order?',
    a: 'Payment is simple — send the full order amount to our JazzCash account (shown at checkout) from your JazzCash app or any bank app. You must be signed in: at checkout enter your delivery details and the TID (Transaction ID) from your payment. We cross-check the TID and your order is confirmed for dispatch.',
  },
  {
    q: 'When will my order be dispatched?',
    a: 'As soon as your full payment is verified — usually within a few hours of you submitting the TID. Delivery then takes 2 to 5 working days nationwide, and the courier calls you before arriving. Shipping is a flat PKR 300 for every city.',
  },
  {
    q: 'Do you offer Cash on Delivery?',
    a: 'No — we deliver only after the full payment is received and verified via JazzCash. This keeps every order safe and confirmed for both sides: you get a payment record, and your parcel is dispatched without any payment collection at the door.',
  },
  {
    q: 'Can I return an item?',
    a: 'Yes — returns are accepted within 3 days of delivery only. Items must be unworn, unwashed and in their original packaging with tags attached. Contact us within 3 days and we will arrange the pickup.',
  },
  {
    q: 'How do I choose the right size?',
    a: 'Every product page includes a Size Guide — kids items are sized by age and height, men\'s items by chest measurement. If you are between sizes or unsure, message us on WhatsApp and we will help you pick.',
  },
  {
    q: 'Is my payment safe?',
    a: 'Yes. Every payment is cross-checked against the TID you submit before your order is confirmed. If an item is unavailable, your payment is fully refunded or moved to another order — your choice.',
  },
]

export function FAQ() {
  return (
    <section aria-label="Frequently asked questions" className="border-t border-border bg-secondary/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
            Help Center
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything about ordering, delivery, payments and returns — in one place.
          </p>
        </div>

        <Accordion type="single" collapsible className="border-t border-border">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`} className="border-b border-border">
              <AccordionTrigger className="text-left text-[13px] font-semibold tracking-[0.08em] uppercase hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

/* =================== Newsletter =================== */

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!valid) {
      toast.error('Please enter a valid email address')
      return
    }
    setDone(true)
    toast.success('Welcome to the ALBA-E circle', {
      description: 'You will be the first to know about new arrivals.',
    })
  }

  return (
    <section aria-label="Newsletter signup" className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="border border-border bg-card p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <Mail className="h-6 w-6 mx-auto text-primary mb-4" strokeWidth={1.5} aria-hidden />
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight mb-2">
            Join the ALBA-E Circle
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
            Be the first to shop new summer arrivals, restocks and seasonal offers.
            No spam — just fashion, a few times a month.
          </p>

          {done ? (
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary" role="status">
              You are on the list — welcome!
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 h-12 border border-border bg-background px-4 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                className="h-12 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors shrink-0"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="mt-5 text-[10px] text-muted-foreground tracking-wide flex items-center justify-center gap-1.5">
            <MessageCircle className="h-3 w-3" />
            Need help now? WhatsApp us — we reply within hours.
          </p>
        </div>
      </div>
    </section>
  )
}
