import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit, auditOncePer } from '@/lib/audit'
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_S,
  clearFailedLogins,
  clientIp,
  createCustomerToken,
  customerAuthConfigured,
  customerCookieOptions,
  forbiddenOrigin,
  getDummyHash,
  getLockSeconds,
  noStoreJson,
  normalizeEmail,
  recordFailedLogin,
  sameOriginOk,
  toPublic,
  verifyPassword,
} from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function locked(seconds: number) {
  const minutes = Math.ceil(seconds / 60)
  return noStoreJson(
    {
      error: `Too many wrong attempts. Sign-in is locked — try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      locked: true,
      retryAfter: seconds,
    },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  )
}

/** POST { email, password } — sign in */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  if (!customerAuthConfigured()) {
    return noStoreJson({ error: 'Customer accounts are not configured on the server.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return noStoreJson({ error: 'Invalid request' }, { status: 400 })
  }
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password || email.length > 254 || password.length > 200) {
    return noStoreJson({ error: 'Enter your email and password' }, { status: 400 })
  }

  const ip = clientIp(req)

  try {
    const lockSeconds = await getLockSeconds(ip, email)
    if (lockSeconds > 0) {
      await auditOncePer({ actor: 'visitor', action: 'customer.login.blocked', ip, detail: 'sign-in locked' }, 15 * 60 * 1000)
      return locked(lockSeconds)
    }

    const customer = await db.customer.findUnique({ where: { email } })
    const passwordOk = await verifyPassword(password, customer?.passwordHash ?? (await getDummyHash()))

    if (!customer || !passwordOk) {
      const result = await recordFailedLogin(ip, email, Boolean(customer))
      await audit({ actor: customer ? `customer:${customer.email}` : 'visitor', action: 'customer.login.failed', ip, detail: customer ? (result.lockSeconds > 0 ? 'now locked' : `${result.attemptsLeft} attempts left`) : 'unknown email' })
      if (result.lockSeconds > 0) return locked(result.lockSeconds)
      return noStoreJson(
        {
          error: `Wrong email or password. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before sign-in is locked.`,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 401 }
      )
    }

    await clearFailedLogins(ip, email)
    await audit({ actor: `customer:${customer.email}`, action: 'customer.login', ip })
    await db.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } })

    const token = createCustomerToken(customer)
    const res = noStoreJson({ customer: toPublic(customer) })
    if (token) res.cookies.set(CUSTOMER_COOKIE, token, customerCookieOptions(CUSTOMER_SESSION_S))
    return res
  } catch (error) {
    // Fail closed: if the lockout store is unreachable we do NOT let anyone in
    console.error('POST /api/auth/login error:', error)
    return noStoreJson({ error: 'Sign-in is temporarily unavailable' }, { status: 503 })
  }
}
