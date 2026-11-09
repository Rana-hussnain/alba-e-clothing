'use client'

import { useState } from 'react'
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Mail,
  MailCheck,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShieldAlert,
  Smartphone,
  XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPKR, parseJsonArray, type Order } from '@/lib/shop'
import { JAZZCASH_ACCOUNT_DISPLAY, JAZZCASH_ACCOUNT_NAME, WHATSAPP_LINK } from '@/lib/contact'
import { toast } from 'sonner'

const TIMELINE = ['Placed', 'Payment', 'Confirmed', 'Shipped', 'Delivered'] as const

const ORDER_FLOW = ['PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const

function nodeState(order: Order, label: (typeof TIMELINE)[number]): 'done' | 'active' | 'todo' {
  if (label === 'Placed') return 'done'
  if (label === 'Payment') {
    if (order.paymentStatus === 'PAID') return 'done'
    return 'active' // payment is the current focus until it is verified
  }
  const nodeIdx = { Confirmed: 1, Shipped: 2, Delivered: 3 }[label] ?? 0
  const orderIdx = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number])
  return nodeIdx <= orderIdx ? 'done' : 'todo'
}

export function OrderSuccess({ order: initialOrder, onContinue }: { order: Order; onContinue: () => void }) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [senderNumber, setSenderNumber] = useState(order.senderNumber ?? '')
  const [tid, setTid] = useState(order.paymentStatus === 'REJECTED' ? '' : (order.txnRef ?? ''))
  const [payErrors, setPayErrors] = useState<{ senderNumber?: string; tid?: string }>({})
  const [payBusy, setPayBusy] = useState(false)

  const items = parseJsonArray(order.itemsJson) as unknown as Array<{
    productId: string
    name: string
    category: string
    size: string
    qty: number
    price: number
    lineTotal: number
  }>

  const paid = order.paymentStatus === 'PAID'
  const verifying = order.paymentStatus === 'VERIFYING'
  const rejected = order.paymentStatus === 'REJECTED'
  const needsPayment = order.paymentStatus === 'PENDING' || rejected


  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: { senderNumber?: string; tid?: string } = {}
    const sender = senderNumber.replace(/[\s-]/g, '')
    if (!/^03[0-9]{9}$/.test(sender))
      next.senderNumber = 'Enter the JazzCash number you paid from, e.g. 03001234567'
    if (tid.trim().length < 4) next.tid = 'Enter the TID from your JazzCash confirmation'
    setPayErrors(next)
    if (Object.keys(next).length > 0) return

    setPayBusy(true)
    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          senderNumber: sender,
          txnRef: tid.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment')
      setOrder(data.order as Order)
      toast.success('Payment details received — we are verifying your payment')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit payment')
    } finally {
      setPayBusy(false)
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16" aria-label="Order confirmation">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* ---------- Header ---------- */}
        <div className="text-center mb-8">
          {paid ? (
            <BadgeCheck className="h-14 w-14 mx-auto mb-5 text-emerald-600" strokeWidth={1.25} />
          ) : rejected ? (
            <ShieldAlert className="h-14 w-14 mx-auto mb-5 text-red-600" strokeWidth={1.25} />
          ) : (
            <CheckCircle2 className="h-14 w-14 mx-auto mb-5 text-primary" strokeWidth={1.25} />
          )}

          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-3">
            {paid
              ? 'Payment Received — Order Confirmed'
              : verifying
                ? 'Payment Submitted — Verifying'
                : rejected
                  ? 'Payment Not Verified'
                  : 'Order Received — Complete Payment'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            {paid ? (
              <>
                Thank you, {order.firstName}! Your full payment of{' '}
                <span className="font-semibold text-foreground">{formatPKR(order.totalPayable)}</span> has
                been received and verified via JazzCash. Your order is confirmed and will be dispatched
                shortly — we will call you on {order.contactNumber}.
              </>
            ) : verifying ? (
              <>
                Thank you, {order.firstName}! We have your payment details (TID{' '}
                <span className="font-semibold text-foreground">{order.txnRef}</span>) and are verifying
                them with JazzCash. Your order is confirmed the moment the payment is verified.
              </>
            ) : rejected ? (
              <>
                We could not match the payment details you submitted. Please double-check the TID in
                your JazzCash app and resubmit below — or WhatsApp us and we will help.
              </>
            ) : (
              <>
                Thank you, {order.firstName}! Your order{' '}
                <span className="font-semibold text-foreground">{order.orderNumber}</span> is reserved.
                Send the full amount of{' '}
                <span className="font-semibold text-foreground">{formatPKR(order.totalPayable)}</span> with
                JazzCash below — we deliver after the payment is verified.
              </>
            )}
          </p>

          <div className="inline-block mt-6 border border-dashed border-border px-6 py-3">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Order Number</p>
            <p className="text-lg font-bold tracking-[0.12em]">{order.orderNumber}</p>
            {(order.txnRef && (paid || verifying)) && (
              <p className="text-[10px] text-muted-foreground mt-1.5 tracking-wide">
                {paid ? 'JazzCash Ref' : 'TID'}: {order.txnRef}
              </p>
            )}
          </div>
        </div>

        {/* ---------- Status timeline ---------- */}
        <div className="border border-border p-5 mb-6" aria-label="Order status">
          {order.status === 'CANCELLED' && (
            <p className="mb-4 flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-red-700">
              <XCircle className="h-4 w-4" /> This order was cancelled
            </p>
          )}
          <ol className="flex items-start">
            {TIMELINE.map((label, i) => {
              const state = nodeState(order, label)
              const isDone = state === 'done'
              return (
                <li key={label} className="flex-1 flex flex-col items-center text-center relative">
                  {i < TIMELINE.length - 1 && (
                    <span
                      className={`absolute top-3 left-1/2 w-full h-px ${
                        nodeState(order, TIMELINE[i + 1]) === 'done' ? 'bg-emerald-500' : 'bg-border'
                      }`}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 h-6 w-6 rounded-full border flex items-center justify-center ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : state === 'active'
                          ? 'bg-amber-400 border-amber-400 text-white'
                          : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[9px] font-bold">{i + 1}</span>
                    )}
                  </span>
                  <span
                    className={`mt-2 text-[9px] font-semibold tracking-[0.1em] uppercase ${
                      isDone || state === 'active' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                  {label === 'Payment' && (
                    <span
                      className={`mt-1 text-[9px] font-bold tracking-[0.1em] uppercase ${
                        paid
                          ? 'text-emerald-700'
                          : verifying
                            ? 'text-amber-700'
                            : 'text-red-600'
                      }`}
                    >
                      {paid ? 'Paid in full' : verifying ? 'Verifying' : rejected ? 'Resubmit' : 'Action needed'}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          {order.trackingNumber && (
            <p className="mt-5 text-xs text-muted-foreground">
              Courier: <span className="font-semibold text-foreground">{order.courier || '—'}</span> · Tracking number:{' '}
              <span className="font-mono font-semibold text-foreground">{order.trackingNumber}</span>
            </p>
          )}
        </div>

        {/* ---------- Payment section ---------- */}
        {needsPayment && (
          <div className="border border-amber-300 bg-amber-50/60 p-5 sm:p-6 mb-6">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2 mb-4">
              <Smartphone className="h-4 w-4" strokeWidth={1.5} />
              Send {formatPKR(order.totalPayable)} — JazzCash {JAZZCASH_ACCOUNT_DISPLAY}
            </h2>
            <ol className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
              <li>
                <span className="font-semibold text-foreground">1.</span> Send the full amount to{' '}
                <span className="font-semibold text-foreground inline-flex items-center gap-1">
                  {JAZZCASH_ACCOUNT_DISPLAY}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(JAZZCASH_ACCOUNT_DISPLAY.replace(/\s/g, ''))
                      toast.success('JazzCash number copied')
                    }}
                    className="h-5 w-5 border border-border bg-background inline-flex items-center justify-center hover:bg-secondary transition-colors"
                    aria-label="Copy JazzCash account number"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>{' '}
                (Account title: {JAZZCASH_ACCOUNT_NAME}).
              </li>
              <li>
                <span className="font-semibold text-foreground">2.</span> Copy the TID / Transaction ID from
                your JazzCash confirmation SMS or app receipt.
              </li>
              <li>
                <span className="font-semibold text-foreground">3.</span> Submit both below — your parcel is
                dispatched once we verify the payment.
              </li>
            </ol>

            <form onSubmit={submitPayment} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="os-sender" className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Number You Paid From <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="os-sender"
                    inputMode="tel"
                    placeholder="03001234567"
                    value={senderNumber}
                    onChange={(e) => {
                      setSenderNumber(e.target.value)
                      if (payErrors.senderNumber) setPayErrors((p) => ({ ...p, senderNumber: undefined }))
                    }}
                    aria-invalid={!!payErrors.senderNumber}
                    className="h-11 rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background"
                  />
                  {payErrors.senderNumber && <p className="text-xs text-destructive">{payErrors.senderNumber}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="os-tid" className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                    TID / Transaction ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="os-tid"
                    placeholder="e.g. T1234567890"
                    value={tid}
                    onChange={(e) => {
                      setTid(e.target.value)
                      if (payErrors.tid) setPayErrors((p) => ({ ...p, tid: undefined }))
                    }}
                    aria-invalid={!!payErrors.tid}
                    className="h-11 rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background font-mono"
                  />
                  {payErrors.tid && <p className="text-xs text-destructive">{payErrors.tid}</p>}
                </div>
              </div>
              <button
                type="submit"
                disabled={payBusy}
                className="w-full h-12 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {payBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  `I Have Sent the Payment — ${formatPKR(order.totalPayable)}`
                )}
              </button>
            </form>
          </div>
        )}

        {/* ---------- Payment status badge (paid / verifying) ---------- */}
        {(paid || verifying) && (
          <div className="mt-0 mb-6 flex justify-center">
            {paid ? (
              <span className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold tracking-[0.14em] uppercase px-4 py-2">
                <BadgeCheck className="h-4 w-4" />
                Paid in Full via JazzCash
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-semibold tracking-[0.14em] uppercase px-4 py-2">
                <Clock3 className="h-4 w-4" />
                Payment Submitted — Verification in Progress
              </span>
            )}
          </div>
        )}

        {/* ---------- Email note ---------- */}
        {order.email && (
          <p className="mb-6 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
            A confirmation email with your order details has been sent to{' '}
            <span className="font-semibold text-foreground">{order.email}</span>.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          {/* Delivery details */}
          <div className="border border-border p-5">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              Delivery Address
            </h2>
            <address className="not-italic text-sm space-y-1 text-muted-foreground">
              <p className="text-foreground font-medium">
                {order.firstName} {order.lastName}
              </p>
              <p>{order.address}</p>
              <p>
                {order.city} — {order.postalCode}
              </p>
              <p className="flex items-center gap-1.5 pt-1">
                <Phone className="h-3.5 w-3.5" /> {order.contactNumber}
              </p>
              {order.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {order.email}
                </p>
              )}
            </address>
          </div>

          {/* Payment breakdown */}
          <div className="border border-border p-5">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" strokeWidth={1.5} />
              Price &amp; Payment
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product Price (PKR)</dt>
                <dd className="font-medium">{formatPKR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping Charges</dt>
                <dd className="font-medium">{formatPKR(order.shippingCharges)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-semibold">Total — Paid in Full</dt>
                <dd className="font-semibold">
                  {formatPKR(order.totalPayable)}
                  {paid && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Paid
                    </span>
                  )}
                  {verifying && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Verifying
                    </span>
                  )}
                </dd>
              </div>
              {(verifying || paid) && order.senderNumber && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid From</dt>
                  <dd className="font-mono text-xs">{order.senderNumber}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Items */}
        <div className="border border-border p-5 mb-8">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            Your Items ({items.reduce((s, i) => s + i.qty, 0)})
          </h2>
          <div className="space-y-4">
            {items.map((i) => (
              <div key={`${i.productId}-${i.size}`} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground uppercase tracking-[0.14em] w-10 shrink-0">
                  ×{i.qty}
                </span>
                <p className="flex-1 text-sm font-medium uppercase tracking-wide">{i.name}</p>
                <p className="text-xs text-muted-foreground">Size {i.size}</p>
                <p className="text-sm font-semibold w-24 text-right">{formatPKR(i.lineTotal)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary/60 border border-border p-5 mb-8">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-1.5">Return Policy</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Return is available within 3 days only. Keep the items unworn with original
            tags and packaging, and contact us within 3 days of delivery to arrange a return.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors mt-3"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Questions? WhatsApp us — we reply fast
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onContinue}
            className="h-12 px-10 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </motion.div>
    </section>
  )
}
