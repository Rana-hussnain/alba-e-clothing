'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Stars } from '@/components/store/stars'

interface AdminReview {
  id: string
  productName: string
  name: string
  city: string
  orderNumber: string
  rating: number
  comment: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

const TABS = [
  { id: 'PENDING', label: 'Waiting for approval' },
  { id: 'APPROVED', label: 'Published' },
  { id: 'REJECTED', label: 'Hidden' },
] as const

/** Owner moderation: a review only appears on the website after you approve it. */
export function ReviewsManager({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [status, setStatus] = useState<(typeof TABS)[number]['id']>('PENDING')
  const [rows, setRows] = useState<AdminReview[] | null>(null)
  const [pending, setPending] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reviews?status=${status}`, { cache: 'no-store' })
      if (res.status === 401) return onSessionExpired()
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRows(data.reviews)
      setPending(data.pending)
    } catch {
      toast.error('Could not load reviews')
    }
  }, [status, onSessionExpired])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount / tab change
    load()
  }, [load])

  const decide = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setBusyId(id)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.status === 401) return onSessionExpired()
      if (!res.ok) throw new Error()
      toast.success(action === 'APPROVE' ? 'Review published' : 'Review hidden')
      load()
    } catch {
      toast.error('Could not update the review')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-label="Customer reviews">
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`h-9 px-4 text-[11px] font-semibold tracking-[0.14em] uppercase border transition-colors ${
              status === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.id === 'PENDING' && pending > 0 && ` (${pending})`}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Only customers with a delivered order can write a review. Approve honest feedback; hide anything abusive or unrelated.
      </p>

      {rows === null ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide">{r.productName}</p>
                <Stars value={r.rating} size={12} />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line mb-2">{r.comment}</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                {r.name} — {r.city} · order {r.orderNumber} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                {r.status !== 'APPROVED' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'APPROVE')}
                    className="h-9 px-4 bg-emerald-700 text-white text-[11px] font-semibold tracking-[0.14em] uppercase inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> Publish
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'REJECT')}
                    className="h-9 px-4 border border-border text-[11px] font-semibold tracking-[0.14em] uppercase inline-flex items-center gap-1.5 hover:bg-secondary disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Hide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
