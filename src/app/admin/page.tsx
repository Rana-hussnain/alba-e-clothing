'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  ShoppingBag,
  Smartphone,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { formatPKR, parseJsonArray } from '@/lib/shop'
import { formatMobileDisplay } from '@/lib/contact'
import { ProductsManager } from '@/components/admin/products-manager'
import { AuditLog } from '@/components/admin/audit-log'
import { ReviewsManager } from '@/components/admin/reviews-manager'

/* ---------------- types ---------------- */

interface Stats {
  total: number
  today: number
  awaiting: number
  verifying: number
  open: number
  delivered: number
  revenue: number
  paidRevenue: number
  paidCount: number
}

interface AdminOrder {
  id: string
  orderNumber: string
  firstName: string
  lastName: string
  address: string
  city: string
  contactNumber: string
  postalCode: string
  email: string | null
  itemsJson: string
  subtotal: number
  shippingCharges: number
  totalPayable: number
  status: string
  paymentMethod: string
  paymentStatus: string
  senderNumber: string | null
  txnRef: string | null
  courier?: string | null
  trackingNumber?: string | null
  createdAt: string
  emails?: EmailLogEntry[]
}

interface EmailLogEntry {
  id: string
  kind: string
  to: string
  subject: string
  status: string
  error?: string | null
  createdAt: string
}

interface DashboardMeta {
  jazzcashAccount: string
  mailLive: boolean
  ownerEmail: string
}

type StatusFilter =
  | 'ALL'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
type AdminTab = 'orders' | 'products' | 'reviews' | 'audit'

/* ---------------- helpers ---------------- */

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', className: 'bg-stone-100 text-stone-700 border-stone-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  SHIPPED: { label: 'Shipped', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
}

const PAYMENT_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Unpaid', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  VERIFYING: { label: 'Verifying TID', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  PAID: { label: 'Paid in Full', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REJECTED: { label: 'Payment Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
}

const EMAIL_BADGE: Record<string, { label: string; className: string }> = {
  SENT: { label: 'Sent', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  QUEUED: { label: 'Queued', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  SKIPPED: { label: 'No email', className: 'bg-secondary text-secondary-foreground border-border' },
}

function waLink(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) digits = '92' + digits.slice(1)
  return `https://wa.me/${digits}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function isNewOrder(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 60 * 60 * 1000
}

/* ================= page ================= */

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [lockLeft, setLockLeft] = useState(0) // seconds until the lockout ends

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [meta, setMeta] = useState<DashboardMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>('orders')

  /* ---- data loading ---- */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setSyncing(true)
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' })
      if (res.status === 401) {
        toast.error('Session expired — please sign in again')
        setAuthed(false)
        return
      }
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setOrders(data.orders ?? [])
      setStats(data.stats ?? null)
      setMeta(data.meta ?? null)
      setLastSync(new Date())
    } catch {
      if (!silent) toast.error('Could not load orders. Is the server running?')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  const onSessionExpired = useCallback(() => setAuthed(false), [])

  /* is there already a valid session cookie? */
  useEffect(() => {
    fetch('/api/admin/login', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setAuthed(Boolean(d.authenticated)))
      .catch(() => setAuthed(false))
      .finally(() => setAuthReady(true))
  }, [])

  /* load when signed in */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    if (authed) load()
  }, [authed, load])

  /* auto-refresh every 30 s */
  useEffect(() => {
    if (!authed) return
    const id = setInterval(() => load(true), 30_000)
    return () => clearInterval(id)
  }, [authed, load])

  /* lockout countdown */
  useEffect(() => {
    if (lockLeft <= 0) return
    const id = setInterval(() => setLockLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [lockLeft])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password || lockLeft > 0) return
    setSigningIn(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setPassword('')
        setAuthed(true)
      } else {
        setPassword('')
        setLoginError(data.error || 'Sign-in failed')
        if (res.status === 429 && typeof data.retryAfter === 'number') setLockLeft(data.retryAfter)
      }
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
    } catch {
      /* cookie expires on its own */
    }
    setAuthed(false)
    setUsername('')
    setPassword('')
    setLoginError(null)
    setOrders([])
    setStats(null)
    setMeta(null)
  }

  const setStatus = async (orderNumber: string, status: string, extra?: { courier?: string; trackingNumber?: string }) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, status, ...extra }),
      })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Could not update the order')
        return
      }
      if (!res.ok) throw new Error()
      toast.success(
        status === 'CANCELLED' ? 'Order cancelled' : `Order marked as ${status.toLowerCase()}`
      )
      await load(true)
    } catch {
      toast.error('Could not update the order')
    }
  }

  const paymentAction = async (orderNumber: string, action: 'VERIFY' | 'REJECT' | 'MARK_PAID') => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, paymentAction: action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      toast.success(
        action === 'REJECT'
          ? 'Payment rejected — customer can resubmit the correct TID'
          : 'Payment verified — order confirmed and customer notified'
      )
      await load(true)
    } catch {
      toast.error('Could not update the payment status')
    }
  }

  /* ---------------- render: login gate ---------------- */

  if (!authReady) return <main className="min-h-screen bg-background" />

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-16 w-16 border border-border bg-black overflow-hidden mb-5">
              <Image src="/logo-mark.png" alt="ALBA-E" fill sizes="64px" className="object-cover" />
            </div>
            <h1 className="text-lg font-bold uppercase tracking-[0.18em]">ALBA-E</h1>
            <p className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground mt-1 mb-7">
              Owner Dashboard
            </p>
          </div>
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={100}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
            {lockLeft > 0 ? (
              <p role="alert" className="text-xs text-red-600 text-center">
                Too many wrong attempts. Locked — try again in{' '}
                {Math.floor(lockLeft / 60)}:{String(lockLeft % 60).padStart(2, '0')}
              </p>
            ) : (
              loginError && (
                <p role="alert" className="text-xs text-red-600 text-center">
                  {loginError}
                </p>
              )
            )}
            <button
              type="submit"
              disabled={signingIn || lockLeft > 0 || !username.trim() || !password}
              className="h-11 w-full bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-50"
            >
              {signingIn ? 'Checking…' : lockLeft > 0 ? 'Locked' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-[10px] text-muted-foreground tracking-wide leading-relaxed">
            Every order placed on the storefront is saved here.
          </p>
          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </main>
    )
  }

  /* ---------------- render: dashboard ---------------- */

  const counts: Record<StatusFilter, number> = {
    ALL: orders.length,
    PENDING_PAYMENT: orders.filter((o) => o.status === 'PENDING_PAYMENT').length,
    CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
    SHIPPED: orders.filter((o) => o.status === 'SHIPPED').length,
    DELIVERED: orders.filter((o) => o.status === 'DELIVERED').length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
  }
  const visible = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-9 w-9 border border-border bg-black overflow-hidden shrink-0">
              <Image src="/logo-mark.png" alt="ALBA-E" fill sizes="36px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.14em] leading-none truncate">
                ALBA-E — Owner Dashboard
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {syncing ? 'Syncing…' : lastSync ? `Synced ${timeAgo(lastSync.toISOString())}` : '—'}
                <span className="inline-flex items-center gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  auto-refresh 30s
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              className="h-9 px-3 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
              aria-label="Refresh orders"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={signOut}
              className="h-9 px-3 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6" role="tablist" aria-label="Admin sections">
          <button
            role="tab"
            aria-selected={tab === 'orders'}
            onClick={() => setTab('orders')}
            className={`h-10 px-5 text-[11px] font-semibold tracking-[0.16em] uppercase border transition-colors inline-flex items-center gap-2 ${
              tab === 'orders'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Orders
          </button>
          <button
            role="tab"
            aria-selected={tab === 'products'}
            onClick={() => setTab('products')}
            className={`h-10 px-5 text-[11px] font-semibold tracking-[0.16em] uppercase border transition-colors inline-flex items-center gap-2 ${
              tab === 'products'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            }`}
          >
            <Package className="h-4 w-4" />
            Products
          </button>
          <button
            role="tab"
            aria-selected={tab === 'reviews'}
            onClick={() => setTab('reviews')}
            className={`h-10 px-5 text-[11px] font-semibold tracking-[0.16em] uppercase border transition-colors inline-flex items-center gap-2 ${
              tab === 'reviews'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            }`}
          >
            <Star className="h-4 w-4" />
            Reviews
          </button>
          <button
            role="tab"
            aria-selected={tab === 'audit'}
            onClick={() => setTab('audit')}
            className={`h-10 px-5 text-[11px] font-semibold tracking-[0.16em] uppercase border transition-colors inline-flex items-center gap-2 ${
              tab === 'audit'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Audit log
          </button>
        </div>

        {tab === 'audit' ? (
          <AuditLog onSessionExpired={onSessionExpired} />
        ) : tab === 'reviews' ? (
          <ReviewsManager onSessionExpired={onSessionExpired} />
        ) : tab === 'products' ? (
          <ProductsManager onSessionExpired={onSessionExpired} />
        ) : (
          <>
        {/* Stats */}
        <section aria-label="Summary stats" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Total Orders" value={stats ? String(stats.total) : '—'} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Today" value={stats ? String(stats.today) : '—'} />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Awaiting Payment"
            value={stats ? String(stats.awaiting) : '—'}
            subtitle={stats && stats.verifying > 0 ? `${stats.verifying} TID submitted` : undefined}
            highlight
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Paid in Full"
            value={stats ? String(stats.paidCount) : '—'}
            subtitle={stats ? formatPKR(stats.paidRevenue) : undefined}
          />
          <StatCard icon={<Truck className="h-4 w-4" />} label="In Progress" value={stats ? String(stats.open) : '—'} />
          <StatCard icon={<Banknote className="h-4 w-4" />} label="Order Value" value={stats ? formatPKR(stats.revenue) : '—'} />
        </section>

        {/* Payments & email status strip */}
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-2 border border-border bg-secondary/40 px-4 py-3 mb-8 text-[11px] text-muted-foreground"
          aria-label="Payment and email settings"
        >
          <span className="inline-flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 shrink-0" />
            <span>
              JazzCash account{' '}
              <strong className="text-foreground tracking-wider">
                {meta?.jazzcashAccount ? formatMobileDisplay(meta.jazzcashAccount) : '—'}
              </strong>
              {' '}· Manual TID verification
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>
              Order emails{' '}
              {meta?.mailLive ? (
                <strong className="text-emerald-700">sending live via SMTP</strong>
              ) : (
                <>recorded here (add SMTP_USER / SMTP_PASS to .env to send live)</>
              )}
              {' '}→ owner <strong className="text-foreground">{meta?.ownerEmail ?? '—'}</strong>
            </span>
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6" role="tablist" aria-label="Filter orders by status">
          {(['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 px-3.5 text-[10px] font-semibold tracking-[0.16em] uppercase border transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              }`}
            >
              {f === 'ALL' ? 'All' : STATUS_META[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border p-5 animate-pulse bg-card">
                <div className="h-4 w-48 bg-secondary mb-4" />
                <div className="h-3 w-full bg-secondary mb-2" />
                <div className="h-3 w-2/3 bg-secondary" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-dashed border-border p-14 text-center">
            <Package className="h-10 w-10 mx-auto mb-4 text-muted-foreground" strokeWidth={1.25} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-1.5">
              {orders.length === 0 ? 'No orders yet' : 'No orders in this view'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {orders.length === 0
                ? 'Orders placed on the storefront appear here automatically — no setup needed. This page refreshes itself every 30 seconds.'
                : 'Try a different status filter above.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4" aria-label="Orders list">
            {visible.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                expanded={expanded === o.id}
                onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                onSetStatus={setStatus}
                onPaymentAction={paymentAction}
              />
            ))}
          </ul>
        )}
          </>
        )}
      </div>
    </main>
  )
}

/* ---------------- small parts ---------------- */

function StatCard({
  icon,
  label,
  value,
  highlight = false,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  subtitle?: string
}) {
  return (
    <div className={`border p-4 bg-card ${highlight ? 'border-foreground/50' : 'border-border'}`}>
      <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-2">
        {icon}
        {label}
      </p>
      <p className="text-base sm:text-lg font-bold tabular-nums leading-none">{value}</p>
      {subtitle && <p className="text-[9px] text-amber-700 font-semibold tracking-wide mt-1.5">{subtitle}</p>}
    </div>
  )
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onSetStatus,
  onPaymentAction,
}: {
  order: AdminOrder
  expanded: boolean
  onToggle: () => void
  onSetStatus: (orderNumber: string, status: string, extra?: { courier?: string; trackingNumber?: string }) => void
  onPaymentAction: (orderNumber: string, action: 'VERIFY' | 'REJECT' | 'MARK_PAID') => void
}) {
  const items = parseJsonArray(order.itemsJson) as unknown as Array<{
    name: string
    size: string
    qty: number
    lineTotal: number
  }>
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    className: 'bg-secondary text-secondary-foreground border-border',
  }
  const payMeta =
    PAYMENT_META[order.paymentStatus] ?? {
      label: order.paymentStatus,
      className: 'bg-secondary text-secondary-foreground border-border',
    }
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')

  return (
    <li className="border border-border bg-card">
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 hover:bg-secondary/40 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold tracking-[0.08em]">{order.orderNumber}</span>
            {isNewOrder(order.createdAt) && (
              <span className="bg-foreground text-background text-[9px] font-bold tracking-[0.14em] uppercase px-1.5 py-0.5">
                New
              </span>
            )}
            <span
              className={`text-[9px] font-semibold tracking-[0.14em] uppercase border px-1.5 py-0.5 ${meta.className}`}
            >
              {meta.label}
            </span>
            <span className={`text-[9px] font-semibold tracking-[0.14em] uppercase border px-1.5 py-0.5 ${payMeta.className}`}>
              {payMeta.label}
            </span>
            {order.paymentStatus === 'VERIFYING' && order.txnRef && (
              <span className="text-[9px] font-mono text-orange-800 bg-orange-50 border border-orange-200 px-1.5 py-0.5 truncate max-w-40">
                TID {order.txnRef}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground tracking-wide">
            <span>{formatDateTime(order.createdAt)}</span>
            <span>·</span>
            <span>{timeAgo(order.createdAt)}</span>
            <span className="font-semibold text-foreground">{formatPKR(order.totalPayable)}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {order.firstName} {order.lastName} · {order.city} · {items.length} item
          {totalQty > 1 ? `s (${totalQty} pcs)` : ''}
        </p>
      </button>

      {/* Card body */}
      {expanded && (
        <div className="border-t border-border p-4 sm:p-5 space-y-5">
          <div className="grid sm:grid-cols-3 gap-5">
            {/* Customer */}
            <div>
              <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
                Customer
              </h3>
              <p className="text-sm font-semibold mb-2">
                {order.firstName} {order.lastName}
              </p>
              <div className="space-y-1.5 text-xs">
                <a
                  href={`tel:${order.contactNumber}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  <Phone className="h-3.5 w-3.5" /> {order.contactNumber}
                </a>
                <a
                  href={waLink(order.contactNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 transition-colors w-fit font-medium"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp customer
                </a>
                {order.email && (
                  <a
                    href={`mailto:${order.email}`}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors w-fit"
                  >
                    <Mail className="h-3.5 w-3.5" /> {order.email}
                  </a>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
                Delivery Address
              </h3>
              <address className="not-italic text-xs text-muted-foreground space-y-1 leading-relaxed">
                <p className="text-foreground">{order.address}</p>
                <p>
                  {order.city} — {order.postalCode}
                </p>
              </address>
            </div>

            {/* Payment */}
            <div>
              <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
                Payment — JazzCash (Full)
              </h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Products</dt>
                  <dd>{formatPKR(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{formatPKR(order.shippingCharges)}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-border pt-1.5">
                  <dt className="font-semibold">Total (paid in full)</dt>
                  <dd className="font-bold">{formatPKR(order.totalPayable)}</dd>
                </div>
                {order.txnRef && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{order.paymentStatus === 'PAID' ? 'JazzCash Ref / TID' : 'Customer TID'}</dt>
                    <dd className="font-mono text-[10px] truncate max-w-32">{order.txnRef}</dd>
                  </div>
                )}
                {order.senderNumber && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Paid From</dt>
                    <dd className="font-mono text-[10px]">{order.senderNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <span className={`text-[9px] font-semibold tracking-[0.14em] uppercase border px-1.5 py-0.5 ${payMeta.className}`}>
                      {payMeta.label}
                    </span>
                  </dd>
                </div>
              </dl>
              {order.paymentStatus === 'VERIFYING' && (
                <p className="mt-3 text-[10px] leading-relaxed text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-2">
                  Customer sent <strong>{formatPKR(order.totalPayable)}</strong> from{' '}
                  <strong className="font-mono">{order.senderNumber}</strong> — cross-check TID{' '}
                  <strong className="font-mono">{order.txnRef}</strong> in your JazzCash app, then verify.
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
              Items ({totalQty})
            </h3>
            <ul className="space-y-1.5">
              {items.map((i, idx) => (
                <li
                  key={`${order.id}-${idx}`}
                  className="flex items-center gap-3 text-xs py-1 border-b border-border/60 last:border-0"
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] w-8 shrink-0">
                    ×{i.qty}
                  </span>
                  <span className="flex-1 font-medium uppercase tracking-wide">{i.name}</span>
                  <span className="text-muted-foreground">Size {i.size}</span>
                  <span className="font-semibold w-24 text-right">{formatPKR(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Order confirmations */}
          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
              Order Confirmations
            </h3>
            <ul className="space-y-1">
              {(order.emails ?? []).map((e) => {
                const badge = EMAIL_BADGE[e.status] ?? {
                  label: e.status,
                  className: 'bg-secondary text-secondary-foreground border-border',
                }
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 text-xs py-1.5 border-b border-border/60 last:border-0 flex-wrap"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-semibold uppercase tracking-[0.08em]">
                      {e.kind === 'CUSTOMER_CONFIRMATION'
                        ? 'Customer receipt'
                        : e.kind === 'PAYMENT_CONFIRMATION'
                          ? 'Payment verified notice'
                          : 'Owner alert'}
                    </span>
                    <span className="text-muted-foreground truncate max-w-44 sm:max-w-64" title={e.to}>
                      → {e.to}
                    </span>
                    <span
                      className={`text-[9px] font-semibold tracking-[0.14em] uppercase border px-1.5 py-0.5 ${badge.className}`}
                      title={e.error ?? undefined}
                    >
                      {badge.label}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </span>
                  </li>
                )
              })}
              {(order.emails ?? []).length === 0 && (
                <li className="text-xs text-muted-foreground">No confirmation emails recorded for this order.</li>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {order.paymentStatus === 'VERIFYING' && order.status !== 'CANCELLED' && (
              <>
                <ActionButton
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  label="Verify Payment Received"
                  onClick={() => onPaymentAction(order.orderNumber, 'VERIFY')}
                />
                <ActionButton
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  label="Reject TID"
                  danger
                  onClick={() => onPaymentAction(order.orderNumber, 'REJECT')}
                />
              </>
            )}
            {(order.paymentStatus === 'PENDING' || order.paymentStatus === 'REJECTED') &&
              order.status !== 'CANCELLED' && (
                <ActionButton
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Mark Paid Manually"
                  onClick={() => onPaymentAction(order.orderNumber, 'MARK_PAID')}
                />
              )}
            {order.status === 'CONFIRMED' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="Courier (TCS, Leopards…)"
                  maxLength={40}
                  className="h-9 w-40 border border-border bg-background px-2 text-xs"
                  aria-label="Courier"
                />
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Tracking number"
                  maxLength={40}
                  className="h-9 w-40 border border-border bg-background px-2 text-xs"
                  aria-label="Tracking number"
                />
                <ActionButton
                  icon={<Truck className="h-3.5 w-3.5" />}
                  label="Mark Shipped"
                  onClick={() => onSetStatus(order.orderNumber, 'SHIPPED', { courier, trackingNumber: tracking })}
                />
              </div>
            )}
            {order.status === 'SHIPPED' && order.trackingNumber && (
              <span className="text-xs self-center text-muted-foreground">
                {order.courier || 'Courier'}: <strong className="text-foreground">{order.trackingNumber}</strong>
              </span>
            )}
            {(order.status === 'CONFIRMED' || order.status === 'SHIPPED') && (
              <ActionButton
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Mark Delivered"
                onClick={() => onSetStatus(order.orderNumber, 'DELIVERED')}
              />
            )}
            {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
              <ActionButton
                icon={<XCircle className="h-3.5 w-3.5" />}
                label="Cancel Order"
                danger
                onClick={() => onSetStatus(order.orderNumber, 'CANCELLED')}
              />
            )}
            {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
              <ActionButton
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                label="Reopen (Awaiting Payment)"
                onClick={() => onSetStatus(order.orderNumber, 'PENDING_PAYMENT')}
              />
            )}
            <span className="ml-auto text-[10px] text-muted-foreground self-center tracking-wide hidden sm:flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              {order.paymentStatus === 'PAID'
                ? 'Paid in full — safe to dispatch'
                : 'Dispatch only after full payment is verified'}
            </span>
          </div>
        </div>
      )}
    </li>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-4 text-[10px] font-semibold tracking-[0.16em] uppercase border inline-flex items-center gap-1.5 transition-colors ${
        danger
          ? 'border-red-200 text-red-700 hover:bg-red-50'
          : 'border-border hover:bg-primary hover:text-primary-foreground hover:border-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
