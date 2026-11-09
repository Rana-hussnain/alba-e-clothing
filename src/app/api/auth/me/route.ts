import { NextRequest } from 'next/server'
import { getSessionCustomer, noStoreJson, toPublic, verificationRequired } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET — the signed-in customer (or null) */
export async function GET(req: NextRequest) {
  try {
    const customer = await getSessionCustomer(req)
    return noStoreJson({
      customer: customer ? toPublic(customer) : null,
      verificationRequired: verificationRequired(),
    })
  } catch (error) {
    console.error('GET /api/auth/me error:', error)
    return noStoreJson({ customer: null, verificationRequired: verificationRequired() })
  }
}
