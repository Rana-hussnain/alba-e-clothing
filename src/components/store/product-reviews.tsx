'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Loader2, Star } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from '@/lib/review-rules'
import { useCustomer } from '@/lib/customer-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Stars } from './stars'

interface PublicReview {
  name: string
  city: string
  rating: number
  comment: string
  createdAt: string
}

interface ReviewsResponse {
  reviews: PublicReview[]
  summary: { average: number; count: number }
  mine: { status: string; rating: number; comment: string } | null
  canReview: boolean
  signedIn: boolean
}

/** Real reviews from verified buyers (approved by the owner) + the form for buyers who received this product. */
export function ProductReviews({ productId }: { productId: string }) {
  const customer = useCustomer((s) => s.customer)
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {
      /* the page still works without reviews */
    }
  }, [productId])

  // re-load when the product changes or the customer signs in / out
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    load()
  }, [load, customer?.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1) return toast.error('Please choose a star rating')
    if (comment.trim().length < REVIEW_MIN_CHARS) return toast.error(`Please write at least ${REVIEW_MIN_CHARS} characters`)
    setBusy(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not save your review')
      toast.success(d.message)
      setComment('')
      setRating(0)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your review')
    } finally {
      setBusy(false)
    }
  }

  const count = data?.summary.count ?? 0

  return (
    <div className="mt-8 border border-border p-5" aria-label="Customer reviews">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase">Customer Reviews</h2>
        {count > 0 && <Stars value={data!.summary.average} count={count} size={12} />}
      </div>

      {data === null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : count === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Reviews come only from customers who received this product.</p>
      ) : (
        <ul className="space-y-4">
          {data.reviews.map((r, i) => (
            <li key={i} className="border-t border-border/70 pt-4 first:border-0 first:pt-0">
              <Stars value={r.rating} size={11} className="mb-1.5" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-2 whitespace-pre-line">{r.comment}</p>
              <p className="text-[11px] tracking-[0.1em] uppercase flex items-center gap-1">
                <span className="font-semibold">{r.name}</span>
                <span className="text-muted-foreground">— {r.city}</span>
                <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-label="Verified buyer" />
              </p>
            </li>
          ))}
        </ul>
      )}

      {data?.mine && (
        <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          {data.mine.status === 'PENDING' && 'Thanks — your review is waiting for approval.'}
          {data.mine.status === 'APPROVED' && 'Your review is published. Thank you!'}
          {data.mine.status === 'REJECTED' && 'Your review was not published because it did not meet our review guidelines.'}
        </p>
      )}

      {data?.canReview && (
        <form onSubmit={submit} className="mt-4 pt-4 border-t border-border space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">Write a review</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
              >
                <Star className={cn('h-6 w-6', n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/40')} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={REVIEW_MAX_CHARS}
            rows={3}
            placeholder="How were the fabric, fit and delivery?"
            className="rounded-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 px-6 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Submit review'}
          </button>
        </form>
      )}
    </div>
  )
}
