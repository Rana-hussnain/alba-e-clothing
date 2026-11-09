import { NextRequest } from 'next/server'
import { audit } from '@/lib/audit'
import { CUSTOMER_COOKIE, clientIp, getSessionCustomer, customerCookieOptions, forbiddenOrigin, noStoreJson, sameOriginOk } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'

/** POST — sign out */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const customer = await getSessionCustomer(req).catch(() => null)
  if (customer) await audit({ actor: `customer:${customer.email}`, action: 'customer.logout', ip: clientIp(req) })
  const res = noStoreJson({ ok: true })
  res.cookies.set(CUSTOMER_COOKIE, '', customerCookieOptions(0))
  return res
}
