'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatPKR, type Order } from '@/lib/shop'
import { useCustomer } from '@/lib/customer-store'
import { AuthPanel } from './auth-panel'

const PAY_LABEL: Record<string, string> = {
  VERIFYING: 'Payment being verified',
  PAID: 'Payment verified',
  REJECTED: 'Payment rejected — resubmit TID',
  PENDING: 'Awaiting payment',
}

export function MyOrders({ onBack, onOpen }: { onBack: () => void; onOpen: (o: Order) => void }) {
  const { customer, ready } = useCustomer()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) return
    let active = true
    fetch('/api/orders/mine', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Could not load orders')
        if (active) setOrders(d.orders ?? [])
      })
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [customer])

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-bold tracking-[0.2em] uppercase mb-8">My Orders</h1>

      {!ready ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : !customer ? (
        <div className="max-w-sm">
          <p className="text-sm text-muted-foreground mb-6">Sign in to see your orders.</p>
          <AuthPanel />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : orders === null ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => onOpen(o)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-wide">{o.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(o.createdAt).toLocaleDateString()} · {PAY_LABEL[o.paymentStatus] ?? o.paymentStatus}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">{formatPKR(o.totalPayable)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
