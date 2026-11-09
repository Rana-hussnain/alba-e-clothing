import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * Owner-dashboard authentication.
 *
 *  - Credentials live in env: ADMIN_USERNAME + ADMIN_PASSWORD_HASH (scrypt, never plain text).
 *  - A successful login sets a signed, httpOnly, SameSite=Strict cookie (no secret in JS / sessionStorage).
 *  - Failed logins are counted in MongoDB (AdminLoginAttempt) so lockouts survive restarts and
 *    work across several server instances. Each lock doubles in length (15 min, 30 min, 1 h … max 24 h).
 *
 * Generate a hash with:  npx tsx scripts/hash-password.ts
 */

export const SESSION_COOKIE = 'albae_admin'
export const SESSION_MAX_AGE_S = 60 * 60 * 8 // 8 hours

const SCRYPT_N = 1 << 15
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SCRYPT_MAXMEM = 128 * 1024 * 1024

const IP_MAX_FAILURES = 5 // wrong tries per IP before it is locked
const ACCOUNT_MAX_FAILURES = 10 // wrong passwords for the real username (from any IP) before it is locked
const BASE_LOCK_MS = 15 * 60 * 1000
const MAX_LOCK_MS = 24 * 60 * 60 * 1000
const FAILURE_MEMORY_MS = 24 * 60 * 60 * 1000 // counters reset after 24 h without failures

/* ------------------------------------------------------------------ */
/* config                                                              */
/* ------------------------------------------------------------------ */

interface AdminConfig {
  username: string
  passwordHash: string
  secret: string
}

export function getAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USERNAME?.trim() ?? ''
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() ?? ''
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? ''
  if (!username || !passwordHash || secret.length < 32) return null
  return { username, passwordHash, secret }
}

/* ------------------------------------------------------------------ */
/* password hashing                                                    */
/* ------------------------------------------------------------------ */

function scryptAsync(password: string, salt: Buffer, N: number, r: number, p: number, keylen: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, { N, r, p, maxmem: SCRYPT_MAXMEM }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

/** Format: scrypt:N:r:p:salt:hash  (base64url; no `$` so .env expansion can't mangle it) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_KEYLEN)
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join(':')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  const N = Number(n)
  const R = Number(r)
  const P = Number(p)
  if (![N, R, P].every((x) => Number.isInteger(x) && x > 0)) return false
  try {
    const expected = Buffer.from(hashB64, 'base64url')
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64url'), N, R, P, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function safeEqualStr(a: string, b: string): boolean {
  // hash both so lengths always match → constant-time compare, no length leak
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** A real-looking hash used to burn the same CPU time when the username is wrong. */
let dummyHashPromise: Promise<string> | null = null
function getDummyHash() {
  dummyHashPromise ??= hashPassword(randomBytes(12).toString('hex'))
  return dummyHashPromise
}

/**
 * Checks username + password in roughly constant time regardless of which one is wrong.
 * Returns whether the username matched too, so the caller can count account-level failures.
 */
export async function checkCredentials(
  cfg: AdminConfig,
  username: string,
  password: string
): Promise<{ ok: boolean; usernameMatched: boolean }> {
  const usernameMatched = safeEqualStr(username.trim().toLowerCase(), cfg.username.toLowerCase())
  const passwordOk = await verifyPassword(password, usernameMatched ? cfg.passwordHash : await getDummyHash())
  return { ok: usernameMatched && passwordOk, usernameMatched }
}

/* ------------------------------------------------------------------ */
/* session cookie                                                      */
/* ------------------------------------------------------------------ */

function fingerprint(cfg: AdminConfig): string {
  // changing the password invalidates every existing session
  return createHash('sha256').update(cfg.passwordHash).digest('base64url').slice(0, 12)
}

function sign(cfg: AdminConfig, payload: string): string {
  return createHmac('sha256', cfg.secret).update(payload).digest('base64url')
}

export function createSessionToken(cfg: AdminConfig): string {
  const payload = Buffer.from(
    JSON.stringify({ u: cfg.username, f: fingerprint(cfg), exp: Date.now() + SESSION_MAX_AGE_S * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(cfg, payload)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  const cfg = getAdminConfig()
  if (!cfg || !token) return false
  const [payload, sig, extra] = token.split('.')
  if (!payload || !sig || extra !== undefined) return false
  if (!safeEqualStr(sig, sign(cfg, payload))) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string
      f?: string
      exp?: number
    }
    return (
      data.u === cfg.username &&
      data.f === fingerprint(cfg) &&
      typeof data.exp === 'number' &&
      data.exp > Date.now()
    )
  } catch {
    return false
  }
}

/** Use in every /api/admin/* handler. */
export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

/* ------------------------------------------------------------------ */
/* lockout                                                             */
/* ------------------------------------------------------------------ */

export function clientIp(req: NextRequest): string {
  // The LAST x-forwarded-for entry is the one added by the host's own proxy; earlier entries can be
  // forged by the visitor, so trusting the first one would let an attacker dodge the IP lockout.
  const fwd = req.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
  const ip = fwd || req.headers.get('x-real-ip')?.trim() || 'unknown'
  return ip.slice(0, 64)
}

const ipKey = (ip: string) => `ip:${ip}`
const ACCOUNT_KEY = 'account'

/** Seconds left on the longest active lock for these keys, or 0 if none. */
export async function getLockSeconds(ip: string): Promise<number> {
  const rows = await db.adminLoginAttempt.findMany({ where: { key: { in: [ipKey(ip), ACCOUNT_KEY] } } })
  const now = Date.now()
  let longest = 0
  for (const row of rows) {
    if (row.lockedUntil && row.lockedUntil.getTime() > now) {
      longest = Math.max(longest, Math.ceil((row.lockedUntil.getTime() - now) / 1000))
    }
  }
  return longest
}

async function registerFailure(key: string, threshold: number): Promise<{ failures: number; lockSeconds: number }> {
  const now = new Date()
  const existing = await db.adminLoginAttempt.findUnique({ where: { key } })
  const stale = !existing || now.getTime() - existing.lastFailureAt.getTime() > FAILURE_MEMORY_MS
  const failures = (stale ? 0 : existing.failures) + 1

  let lockedUntil: Date | null = stale ? null : existing.lockedUntil
  let lockSeconds = 0
  if (failures % threshold === 0) {
    const strikes = failures / threshold // 1st lock, 2nd lock, …
    const ms = Math.min(BASE_LOCK_MS * 2 ** (strikes - 1), MAX_LOCK_MS)
    lockedUntil = new Date(now.getTime() + ms)
    lockSeconds = Math.ceil(ms / 1000)
  }

  await db.adminLoginAttempt.upsert({
    where: { key },
    create: { key, failures, lockedUntil, lastFailureAt: now },
    update: { failures, lockedUntil, lastFailureAt: now },
  })
  return { failures, lockSeconds }
}

/**
 * Records a failed login. Returns how many tries this IP has left and, if this
 * failure tripped a lock, how long it lasts.
 */
export async function recordFailedLogin(
  ip: string,
  usernameMatched: boolean
): Promise<{ attemptsLeft: number; lockSeconds: number }> {
  const ipResult = await registerFailure(ipKey(ip), IP_MAX_FAILURES)
  let lockSeconds = ipResult.lockSeconds
  if (usernameMatched) {
    const acct = await registerFailure(ACCOUNT_KEY, ACCOUNT_MAX_FAILURES)
    lockSeconds = Math.max(lockSeconds, acct.lockSeconds)
  }
  return {
    attemptsLeft: lockSeconds ? 0 : IP_MAX_FAILURES - (ipResult.failures % IP_MAX_FAILURES),
    lockSeconds,
  }
}

export async function clearFailedLogins(ip: string): Promise<void> {
  await db.adminLoginAttempt.deleteMany({ where: { key: { in: [ipKey(ip), ACCOUNT_KEY] } } })
}
