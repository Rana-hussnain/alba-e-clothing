import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionCustomer, noStoreJson } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET — the signed-in customer's orders, newest first */
export async function GET(req: NextRequest) {
  const customer = await getSessionCustomer(req)
  if (!customer) return noStoreJson({ error: 'Please sign in' }, { status: 401 })
  try {
    const orders = await db.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return noStoreJson({ orders })
  } catch (error) {
    console.error('GET /api/orders/mine error:', error)
    return noStoreJson({ error: 'Failed to load your orders' }, { status: 500 })
  }
}
