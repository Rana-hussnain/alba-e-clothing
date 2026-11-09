import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/customer-auth'

/**
 * Audit trail — who did what, when, from which IP. Shown to the owner in /admin → Audit log.
 *
 * Tamper-evident: every entry carries a running number (`seq`), the hash of the entry before it
 * (`prevHash`) and its own HMAC (`hash`, keyed with a secret that only the server knows). Editing, deleting
 * or inserting a row anywhere in the middle breaks the chain, and "Check integrity" in /admin shows exactly where.
 * The application never edits or deletes entries.
 *
 * NEVER put passwords, reset/verification tokens or session cookies in `detail`.
 * A failed log write must not break the action being logged, so it is retried and then only printed.
 */
export interface AuditEntry {
  /** "admin" | "customer:<email>" | "system" */
  actor: string
  /** dotted event name, e.g. "customer.login", "admin.payment.verify" */
  action: string
  /** what it happened to: an order number, product id, email … */
  target?: string
  ip?: string
  /** short human-readable extra info */
  detail?: string
}

const GENESIS = 'GENESIS'

/** Signing key: AUDIT_LOG_KEY if set, otherwise derived from ADMIN_SESSION_SECRET. */
function signingKey(): Buffer {
  const secret = process.env.AUDIT_LOG_KEY?.trim() || process.env.ADMIN_SESSION_SECRET?.trim() || ''
  return createHmac('sha256', secret).update('albae-audit-log-v1').digest()
}

/** Short fingerprint of the key, stored per entry so a changed key is reported as "key changed", not "tampered". */
function keyFingerprint(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8)
}

interface HashInput {
  seq: number
  createdAt: Date
  actor: string
  action: string
  target: string | null
  ip: string | null
  detail: string | null
  prevHash: string
}

function entryHash(key: Buffer, e: HashInput): string {
  const canonical = JSON.stringify([e.seq, e.createdAt.toISOString(), e.actor, e.action, e.target, e.ip, e.detail, e.prevHash])
  return createHmac('sha256', key).update(canonical).digest('hex')
}

const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function audit(entry: AuditEntry): Promise<void> {
  const clean = {
    actor: entry.actor.slice(0, 120),
    action: entry.action.slice(0, 60),
    target: entry.target?.slice(0, 120) ?? null,
    ip: entry.ip?.slice(0, 64) ?? null,
    detail: entry.detail?.slice(0, 300) ?? null,
  }
  const key = signingKey()
  const keyId = keyFingerprint(key)

  // The unique index on `seq` makes concurrent writers take turns: whoever loses retries with the next number.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const last = await db.auditLog.findFirst({ orderBy: { seq: 'desc' }, select: { seq: true, hash: true } })
      const seq = (last?.seq ?? 0) + 1
      const prevHash = last?.hash ?? GENESIS
      const createdAt = new Date()
      const hash = entryHash(key, { seq, createdAt, ...clean, prevHash })
      await db.auditLog.create({ data: { seq, createdAt, ...clean, prevHash, hash, keyId } })
      return
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') continue // someone else took this seq — try the next one
      console.error('audit log write failed:', error)
      return
    }
  }
  console.error('audit log write failed: too many concurrent writers')
}

/**
 * Like audit(), but records the same event from the same IP only once per `windowMs`.
 * Used for events a bot can repeat endlessly (e.g. hammering a locked sign-in), so the log cannot be flooded.
 */
export async function auditOncePer(entry: AuditEntry, windowMs: number): Promise<void> {
  const wait = await rateLimit(`audit:${entry.action}:${entry.ip ?? '-'}`, 1, windowMs)
  if (wait === 0) await audit(entry)
}

export interface IntegrityReport {
  ok: boolean
  total: number
  /** hash of the newest entry — note it down to detect later deletion of recent entries */
  head: string | null
  brokenAtSeq: number | null
  problem: string | null
  /** entries signed with a different key (ADMIN_SESSION_SECRET / AUDIT_LOG_KEY was changed) — cannot be checked */
  unverifiable: number
}

/** Walks the whole chain from entry 1 and reports the first problem, if any. */
export async function verifyAuditChain(): Promise<IntegrityReport> {
  const key = signingKey()
  const keyId = keyFingerprint(key)
  const report: IntegrityReport = { ok: true, total: 0, head: null, brokenAtSeq: null, problem: null, unverifiable: 0 }

  let expectedSeq = 1
  let prevHash = GENESIS
  let cursor = 0
  for (;;) {
    const rows = await db.auditLog.findMany({ where: { seq: { gt: cursor } }, orderBy: { seq: 'asc' }, take: 500 })
    if (rows.length === 0) break
    for (const r of rows) {
      report.total++
      const fail = (problem: string) => {
        report.ok = false
        report.brokenAtSeq = r.seq
        report.problem = problem
        return report
      }
      if (r.seq !== expectedSeq) return fail(`Entry ${expectedSeq} is missing (an entry was deleted).`)
      if (!sameHash(r.prevHash, prevHash)) return fail(`Entry ${r.seq} does not follow the previous entry (the history was changed).`)
      if (r.keyId === keyId) {
        const expected = entryHash(key, r)
        if (!sameHash(r.hash, expected)) return fail(`Entry ${r.seq} was edited after it was written.`)
      } else {
        report.unverifiable++
      }
      prevHash = r.hash
      report.head = r.hash
      expectedSeq++
      cursor = r.seq
    }
  }
  return report
}
