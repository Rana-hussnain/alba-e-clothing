import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import {
  RESET_TOKEN_TTL_MS,
  clientIp,
  customerAuthConfigured,
  forbiddenOrigin,
  newToken,
  noStoreJson,
  normalizeEmail,
  rateLimit,
  sameOriginOk,
  siteBaseUrl,
  validEmail,
} from '@/lib/customer-auth'
import { sendPasswordResetEmail } from '@/lib/mail'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GENERIC = { ok: true, message: 'If that email has an account, we sent a password-reset link. It works for 1 hour.' }

/** POST { email } — email a password-reset link. Always answers the same, whether or not the account exists. */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  if (!customerAuthConfigured()) {
    return noStoreJson({ error: 'Customer accounts are not configured on the server.' }, { status: 503 })
  }
  let email = ''
  try {
    email = normalizeEmail((await req.json())?.email)
  } catch {
    return noStoreJson({ error: 'Invalid request' }, { status: 400 })
  }
  if (!validEmail(email)) return noStoreJson({ error: 'Enter a valid email address' }, { status: 400 })

  const ip = clientIp(req)
  const waitIp = await rateLimit(`forgot-ip:${ip}`, 5, 60 * 60 * 1000)
  const waitEmail = await rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000)
  if (waitIp > 0 || waitEmail > 0) {
    // Same generic answer — do not reveal that this email is being rate-limited
    return noStoreJson(GENERIC)
  }

  try {
    const customer = await db.customer.findUnique({ where: { email } })
    if (customer) {
      const { token, hash } = newToken()
      await db.customer.update({
        where: { id: customer.id },
        data: { resetTokenHash: hash, resetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      })
      await audit({ actor: `customer:${customer.email}`, action: 'customer.password.forgot', ip })
      await sendPasswordResetEmail(customer.email, customer.name, `${siteBaseUrl(req)}/?reset=${token}`)
    }
  } catch (error) {
    console.error('POST /api/auth/forgot error:', error)
  }
  return noStoreJson(GENERIC)
}
