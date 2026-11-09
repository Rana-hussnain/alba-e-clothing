import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clientIp, hashPassword, verifyPassword } from '@/lib/admin-auth'
import { isMailLive } from '@/lib/mail'

/**
 * Customer accounts.
 *
 *  - Passwords: scrypt hash only (same hardened hasher as the owner login), strong-password policy.
 *  - Session: signed, httpOnly, SameSite=Strict cookie (7 days). The cookie carries a fingerprint of the
 *    password hash, so changing/resetting the password signs out every other device.
 *  - Brute-force protection: 5 wrong passwords from one IP (or 10 on one account) lock login; every
 *    repeat lock doubles (15 min → 30 min → 1 h … max 24 h). Counters live in the database.
 *  - Email verification + password reset use random one-time tokens; only their SHA-256 hash is stored.
 *  - Sign-in / sign-up errors are generic so nobody can discover which emails have accounts.
 */

export const CUSTOMER_COOKIE = 'albae_customer'
export const CUSTOMER_SESSION_S = 60 * 60 * 24 * 7 // 7 days

const IP_MAX_FAILURES = 5
const ACCOUNT_MAX_FAILURES = 10
const BASE_LOCK_MS = 15 * 60 * 1000
const MAX_LOCK_MS = 24 * 60 * 60 * 1000
const FAILURE_MEMORY_MS = 24 * 60 * 60 * 1000

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 h
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 h

/* ------------------------------------------------------------------ */
/* config                                                              */
/* ------------------------------------------------------------------ */

function secret(): string | null {
  const own = process.env.CUSTOMER_SESSION_SECRET?.trim()
  if (own && own.length >= 32) return own
  // No separate secret? Derive an independent key from the admin one (a customer cookie can never be an admin cookie).
  const admin = process.env.ADMIN_SESSION_SECRET?.trim()
  if (admin && admin.length >= 32) {
    return createHmac('sha256', admin).update('albae-customer-session-v1').digest('base64url')
  }
  return null
}

export const customerAuthConfigured = () => secret() !== null

/**
 * Customers must confirm their email before they can order — but only when the server can actually send mail
 * (otherwise nobody could ever verify). Turn off explicitly with REQUIRE_EMAIL_VERIFICATION=false.
 */
export function verificationRequired(): boolean {
  return isMailLive() && process.env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase() !== 'false'
}

/** Public base URL for links in emails. Prefer the configured site URL (never trust a spoofable Host header). */
export function siteBaseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') || req.nextUrl.origin
}

/* ------------------------------------------------------------------ */
/* input validation                                                    */
/* ------------------------------------------------------------------ */

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.normalize('NFKC').trim().toLowerCase() : ''
}

export function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

export function normalizePhone(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : ''
}

export const validPkMobile = (phone: string) => /^03[0-9]{9}$/.test(phone)

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd123', 'qwertyuiop', 'qwerty12345',
  '1234567890', '12345678910', 'iloveyou123', 'admin12345', 'letmein1234', 'welcome1234', 'abc1234567',
  'pakistan123', 'karachi123', 'lahore1234', 'albae12345', 'alba-e1234', 'changeme123', '0123456789',
])

/** Returns a human-readable problem with the password, or null when it is acceptable. */
export function passwordProblem(password: unknown, email = '', name = ''): string | null {
  if (typeof password !== 'string') return 'Password is required'
  if (password.length < 10) return 'Password must be at least 10 characters'
  if (password.length > 128) return 'Password is too long (max 128 characters)'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number'
  }
  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) return 'That password is too common — choose a less predictable one'
  if (/^(.)\1+$/.test(password)) return 'Password cannot be one repeated character'
  const local = email.split('@')[0]
  if (local.length >= 4 && lower.includes(local)) return 'Password cannot contain your email name'
  const first = name.trim().split(/\s+/)[0]?.toLowerCase()
  if (first && first.length >= 4 && lower.includes(first)) return 'Password cannot contain your name'
  return null
}

/* ------------------------------------------------------------------ */
/* one-time tokens (email verification / password reset)               */
/* ------------------------------------------------------------------ */

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/* ------------------------------------------------------------------ */
/* session cookie                                                      */
/* ------------------------------------------------------------------ */

export interface PublicCustomer {
  id: string
  name: string
  email: string
  phone: string
  emailVerified: boolean
}

const fingerprint = (passwordHash: string) =>
  createHash('sha256').update(passwordHash).digest('base64url').slice(0, 12)

function sign(key: string, payload: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function createCustomerToken(customer: { id: string; passwordHash: string }): string | null {
  const key = secret()
  if (!key) return null
  const payload = Buffer.from(
    JSON.stringify({ c: customer.id, f: fingerprint(customer.passwordHash), exp: Date.now() + CUSTOMER_SESSION_S * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(key, payload)}`
}

export function customerCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

export const toPublic = (c: {
  id: string
  name: string
  email: string
  phone: string
  emailVerified: boolean
}): PublicCustomer => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, emailVerified: c.emailVerified })

/** The signed-in customer for this request, or null. Always re-checks the database (deleted / password changed ⇒ signed out). */
export async function getSessionCustomer(req: NextRequest) {
  const key = secret()
  const token = req.cookies.get(CUSTOMER_COOKIE)?.value
  if (!key || !token) return null
  const [payload, sig, extra] = token.split('.')
  if (!payload || !sig || extra !== undefined) return null
  if (!safeEqual(sig, sign(key, payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      c?: string
      f?: string
      exp?: number
    }
    if (!data.c || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    const customer = await db.customer.findUnique({ where: { id: data.c } })
    if (!customer || data.f !== fingerprint(customer.passwordHash)) return null
    return customer
  } catch {
    return null // malformed id / token
  }
}

/* ------------------------------------------------------------------ */
/* CSRF / helpers for route handlers                                   */
/* ------------------------------------------------------------------ */

/** State-changing requests must originate from our own site (defence in depth on top of SameSite=Strict). */
export function sameOriginOk(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).host === req.headers.get('host')
    } catch {
      return false
    }
  }
  return req.headers.get('sec-fetch-site') !== 'cross-site'
}

export function noStoreJson(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  })
}

export function forbiddenOrigin() {
  return noStoreJson({ error: 'Cross-site request blocked' }, { status: 403 })
}

/* ------------------------------------------------------------------ */
/* rate limiting (fixed window)                                        */
/* ------------------------------------------------------------------ */

/** Returns 0 when the action is allowed, otherwise the seconds until the window resets. */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<number> {
  try {
    const now = Date.now()
    const row = await db.rateLimit.findUnique({ where: { key } })
    if (!row || now - row.windowStart.getTime() >= windowMs) {
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: new Date(now) },
        update: { count: 1, windowStart: new Date(now) },
      })
      return 0
    }
    if (row.count >= max) return Math.ceil((row.windowStart.getTime() + windowMs - now) / 1000)
    await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })
    return 0
  } catch (e) {
    console.error('rate limit check failed (allowing request):', e)
    return 0
  }
}

/* ------------------------------------------------------------------ */
/* login lockout                                                       */
/* ------------------------------------------------------------------ */

const ipKey = (ip: string) => `cip:${ip}`
const emailKey = (email: string) => `cemail:${email.slice(0, 254)}`

export async function getLockSeconds(ip: string, email: string): Promise<number> {
  const rows = await db.customerLoginAttempt.findMany({ where: { key: { in: [ipKey(ip), emailKey(email)] } } })
  const now = Date.now()
  let longest = 0
  for (const row of rows) {
    if (row.lockedUntil && row.lockedUntil.getTime() > now) {
      longest = Math.max(longest, Math.ceil((row.lockedUntil.getTime() - now) / 1000))
    }
  }
  return longest
}

async function registerFailure(key: string, threshold: number) {
  const now = new Date()
  const existing = await db.customerLoginAttempt.findUnique({ where: { key } })
  const stale = !existing || now.getTime() - existing.lastFailureAt.getTime() > FAILURE_MEMORY_MS
  const failures = (stale ? 0 : existing.failures) + 1
  let lockedUntil: Date | null = stale ? null : existing.lockedUntil
  let lockSeconds = 0
  if (failures % threshold === 0) {
    const strikes = failures / threshold
    const ms = Math.min(BASE_LOCK_MS * 2 ** (strikes - 1), MAX_LOCK_MS)
    lockedUntil = new Date(now.getTime() + ms)
    lockSeconds = Math.ceil(ms / 1000)
  }
  await db.customerLoginAttempt.upsert({
    where: { key },
    create: { key, failures, lockedUntil, lastFailureAt: now },
    update: { failures, lockedUntil, lastFailureAt: now },
  })
  return { failures, lockSeconds }
}

/** Records a wrong password. The account counter is only kept for emails that really exist (no junk rows for random emails). */
export async function recordFailedLogin(ip: string, email: string, accountExists: boolean) {
  const ipResult = await registerFailure(ipKey(ip), IP_MAX_FAILURES)
  let lockSeconds = ipResult.lockSeconds
  if (accountExists) {
    const acct = await registerFailure(emailKey(email), ACCOUNT_MAX_FAILURES)
    lockSeconds = Math.max(lockSeconds, acct.lockSeconds)
  }
  return {
    attemptsLeft: lockSeconds ? 0 : IP_MAX_FAILURES - (ipResult.failures % IP_MAX_FAILURES),
    lockSeconds,
  }
}

export async function clearFailedLogins(ip: string, email: string) {
  await db.customerLoginAttempt.deleteMany({ where: { key: { in: [ipKey(ip), emailKey(email)] } } })
}

/* ------------------------------------------------------------------ */
/* misc                                                                */
/* ------------------------------------------------------------------ */

/** A real-looking hash so a wrong email costs the same CPU time as a wrong password. */
let dummy: Promise<string> | null = null
export const getDummyHash = () => (dummy ??= hashPassword(randomBytes(12).toString('hex')))

export { clientIp, hashPassword, verifyPassword }
