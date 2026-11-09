import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import {
  clientIp,
  forbiddenOrigin,
  hashPassword,
  hashToken,
  noStoreJson,
  passwordProblem,
  rateLimit,
  sameOriginOk,
} from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** POST { token, password } — set a new password using the emailed one-time token */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  let token = ''
  let password: unknown
  try {
    const body = await req.json()
    token = typeof body?.token === 'string' ? body.token : ''
    password = body?.password
  } catch {
    return noStoreJson({ error: 'Invalid request' }, { status: 400 })
  }
  if (token.length < 20 || token.length > 100) {
    return noStoreJson({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  const wait = await rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (wait > 0) {
    return noStoreJson(
      { error: 'Too many attempts. Please try again later.', retryAfter: wait },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }

  try {
    const customer = await db.customer.findFirst({ where: { resetTokenHash: hashToken(token) } })
    if (!customer || !customer.resetExpires || customer.resetExpires.getTime() < Date.now()) {
      return noStoreJson({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
    }
    const problem = passwordProblem(password, customer.email, customer.name)
    if (problem) return noStoreJson({ error: problem }, { status: 400 })

    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await hashPassword(password as string), // new hash ⇒ every old session stops working
        resetTokenHash: null,
        resetExpires: null,
        emailVerified: true, // they proved they own the mailbox
        verifyTokenHash: null,
        verifyExpires: null,
      },
    })
    await db.customerLoginAttempt.deleteMany({ where: { key: `cemail:${customer.email}` } })
    await audit({ actor: `customer:${customer.email}`, action: 'customer.password.reset', ip: clientIp(req) })
    return noStoreJson({ ok: true, message: 'Password updated. You can now sign in.' })
  } catch (error) {
    console.error('POST /api/auth/reset error:', error)
    return noStoreJson({ error: 'Could not reset the password. Please try again.' }, { status: 500 })
  }
}
