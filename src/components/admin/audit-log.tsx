'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface AuditRow {
  id: string
  seq: number
  createdAt: string
  actor: string
  action: string
  target: string | null
  ip: string | null
  detail: string | null
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'admin', label: 'Owner actions' },
  { id: 'customer', label: 'Customers' },
  { id: 'security', label: 'Security alerts' },
] as const

const LABELS: Record<string, string> = {
  'customer.register': 'Customer registered',
  'customer.register.duplicate': 'Sign-up with an existing email',
  'customer.email.verified': 'Email verified',
  'customer.login': 'Customer signed in',
  'customer.login.failed': 'Failed customer sign-in',
  'customer.login.blocked': 'Customer sign-in blocked (locked)',
  'customer.logout': 'Customer signed out',
  'customer.password.forgot': 'Password reset requested',
  'customer.password.reset': 'Password changed',
  'customer.order.placed': 'Order placed',
  'customer.payment.resubmitted': 'Customer sent a new TID',
  'admin.login': 'Owner signed in',
  'admin.login.failed': 'Failed owner sign-in',
  'admin.login.blocked': 'Owner sign-in blocked (locked)',
  'admin.logout': 'Owner signed out',
  'admin.payment.verify': 'Payment verified',
  'admin.payment.mark_paid': 'Payment marked paid',
  'admin.payment.reject': 'Payment rejected',
  'admin.order.status': 'Order status changed',
  'admin.product.create': 'Product added',
  'admin.product.update': 'Product edited',
  'admin.product.delete': 'Product deleted',
  'admin.image.upload': 'Image uploaded',
  'admin.audit.verified': 'Audit log integrity checked — intact',
  'admin.audit.TAMPERING_DETECTED': 'Audit log integrity check FAILED',
}

const isAlert = (a: string) => /failed|blocked|TAMPERING/.test(a)

export function AuditLog({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [report, setReport] = useState<{ ok: boolean; total: number; problem: string | null; unverifiable: number; head: string | null } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/audit?filter=${filter}`, { cache: 'no-store' })
      if (res.status === 401) return onSessionExpired()
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setRows(data.logs)
    } catch {
      toast.error('Could not load the audit log')
    } finally {
      setLoading(false)
    }
  }, [filter, onSessionExpired])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount / filter change
    load()
  }, [load])

  const checkIntegrity = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/admin/audit?verify=1', { cache: 'no-store' })
      if (res.status === 401) return onSessionExpired()
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setReport(data.report)
      load()
    } catch {
      toast.error('Could not check the audit log')
    } finally {
      setChecking(false)
    }
  }

  return (
    <section aria-label="Audit log">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`h-9 px-4 text-[11px] font-semibold tracking-[0.14em] uppercase border transition-colors ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkIntegrity}
            disabled={checking}
            className="h-9 px-3 border border-border text-[11px] font-semibold tracking-[0.14em] uppercase inline-flex items-center gap-2 hover:bg-secondary disabled:opacity-60"
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${checking ? 'animate-pulse' : ''}`} /> Check integrity
          </button>
          <button
            onClick={load}
            className="h-9 px-3 border border-border text-[11px] font-semibold tracking-[0.14em] uppercase inline-flex items-center gap-2 hover:bg-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {report && (
        <div
          role="status"
          className={`mb-4 p-4 text-xs leading-relaxed border flex gap-3 ${
            report.ok ? 'border-emerald-600/40 bg-emerald-50 text-emerald-900' : 'border-destructive/50 bg-destructive/5 text-destructive'
          }`}
        >
          {report.ok ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
          <div>
            {report.ok ? (
              <p>
                <strong>All {report.total} entries are intact</strong> — none were edited, deleted or inserted.
                {report.unverifiable > 0 && ` (${report.unverifiable} older entries were signed with a previous secret and could only be chain-checked.)`}
              </p>
            ) : (
              <p>
                <strong>Warning: the audit log was changed.</strong> {report.problem} Someone with access to the database
                may have edited it. Change your database and admin passwords, and keep this screen as evidence.
              </p>
            )}
            {report.head && <p className="mt-1 opacity-70 font-mono break-all">Latest fingerprint: {report.head.slice(0, 16)}…</p>}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-4">
        Read-only record of sign-ins, orders, TID checks and every action you take here. Latest 100 entries.
      </p>

      {rows === null ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 font-semibold">Event</th>
                <th className="px-3 py-2.5 font-semibold">Who</th>
                <th className="px-3 py-2.5 font-semibold">Target</th>
                <th className="px-3 py-2.5 font-semibold">Details</th>
                <th className="px-3 py-2.5 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className={isAlert(r.action) ? 'bg-destructive/5' : undefined}>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{r.seq}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className={`px-3 py-2.5 font-semibold ${isAlert(r.action) ? 'text-destructive' : ''}`}>
                    {LABELS[r.action] ?? r.action}
                  </td>
                  <td className="px-3 py-2.5 break-all">{r.actor.replace('customer:', '')}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.target ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.detail ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
