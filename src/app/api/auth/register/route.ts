import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import {
  VERIFY_TOKEN_TTL_MS,
  clientIp,
  customerAuthConfigured,
  forbiddenOrigin,
  hashPassword,
  newToken,
  noStoreJson,
  normalizeEmail,
  normalizePhone,
  passwordProblem,
  rateLimit,
  sameOriginOk,
  siteBaseUrl,
  validEmail,
  validPkMobile,
} from '@/lib/customer-auth'
import { sendExistingAccountNotice, sendVerificationEmail } from '@/lib/mail'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GENERIC_OK = {
  ok: true,
  message: 'Account created. We sent a verification link to your email — open it, then sign in.',
}

/** POST { name, email, phone, password } — create a customer account */
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

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const email = normalizeEmail(body.email)
  const phone = normalizePhone(body.phone)
  const password = body.password

  if (name.length < 2 || name.length > 60) {
    return noStoreJson({ error: 'Enter your full name (2–60 characters)' }, { status: 400 })
  }
  if (!validEmail(email)) return noStoreJson({ error: 'Enter a valid email address' }, { status: 400 })
  if (!validPkMobile(phone)) {
    return noStoreJson({ error: 'Enter a valid mobile number, e.g. 03001234567' }, { status: 400 })
  }
  const problem = passwordProblem(password, email, name)
  if (problem) return noStoreJson({ error: problem }, { status: 400 })

  const ip = clientIp(req)
  const wait = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (wait > 0) {
    return noStoreJson(
      { error: 'Too many sign-up attempts. Please try again later.', retryAfter: wait },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }

  try {
    // Always hash first so "new email" and "existing email" take the same time
    const passwordHash = await hashPassword(password as string)
    const existing = await db.customer.findUnique({ where: { email } })

    if (existing) {
      // Same response as success (no account enumeration); the real owner of the email gets a heads-up
      await audit({ actor: `customer:${email}`, action: 'customer.register.duplicate', ip })
      await sendExistingAccountNotice(existing.email, existing.name)
      return noStoreJson(GENERIC_OK, { status: 201 })
    }

    const { token, hash } = newToken()
    try {
      await db.customer.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          verifyTokenHash: hash,
          verifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
        },
      })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return noStoreJson(GENERIC_OK, { status: 201 }) // lost a race
      throw e
    }

    await audit({ actor: `customer:${email}`, action: 'customer.register', ip })
    await sendVerificationEmail(email, name, `${siteBaseUrl(req)}/api/auth/verify?token=${token}`)
    return noStoreJson(GENERIC_OK, { status: 201 })
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return noStoreJson({ error: 'Could not create the account. Please try again.' }, { status: 500 })
  }
}
