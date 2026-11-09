import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  VERIFY_TOKEN_TTL_MS,
  forbiddenOrigin,
  getSessionCustomer,
  newToken,
  noStoreJson,
  rateLimit,
  sameOriginOk,
  siteBaseUrl,
} from '@/lib/customer-auth'
import { sendVerificationEmail } from '@/lib/mail'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** POST — email a fresh verification link to the signed-in customer */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const customer = await getSessionCustomer(req)
  if (!customer) return noStoreJson({ error: 'Please sign in first' }, { status: 401 })
  if (customer.emailVerified) return noStoreJson({ ok: true, alreadyVerified: true })

  const wait = await rateLimit(`resend:${customer.id}`, 3, 60 * 60 * 1000)
  if (wait > 0) {
    return noStoreJson(
      { error: 'Too many requests. Please try again later.', retryAfter: wait },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }

  const { token, hash } = newToken()
  await db.customer.update({
    where: { id: customer.id },
    data: { verifyTokenHash: hash, verifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
  })
  await sendVerificationEmail(customer.email, customer.name, `${siteBaseUrl(req)}/api/auth/verify?token=${token}`)
  return noStoreJson({ ok: true })
}
