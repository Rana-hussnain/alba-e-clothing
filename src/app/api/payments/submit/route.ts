import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { sendOwnerPaymentAlert } from '@/lib/mail'
import { clientIp, forbiddenOrigin, getSessionCustomer, noStoreJson, rateLimit, sameOriginOk } from '@/lib/customer-auth'
import { normalizeTid, validSenderNumber, validTid } from '@/lib/payment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/payments/submit  { orderNumber, senderNumber, txnRef }
 *
 * Used when the owner could not find the first TID (payment "REJECTED"): the signed-in customer
 * re-checks it and sends the correct JazzCash TID. The order goes back to "verifying" and the owner is emailed.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const customer = await getSessionCustomer(req)
  if (!customer) return noStoreJson({ error: 'Please sign in' }, { status: 401 })

  let reserved: string | null = null
  try {
    const body = (await req.json()) as { orderNumber?: unknown; senderNumber?: unknown; txnRef?: unknown }
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''
    const sender = typeof body.senderNumber === 'string' ? body.senderNumber.replace(/[\s-]/g, '') : ''
    const tid = normalizeTid(body.txnRef)

    if (!orderNumber) return noStoreJson({ error: 'orderNumber is required' }, { status: 400 })
    if (!validSenderNumber(sender)) {
      return noStoreJson({ error: 'Enter the valid JazzCash mobile number you paid from, e.g. 03001234567' }, { status: 400 })
    }
    if (!validTid(tid)) {
      return noStoreJson({ error: 'Enter the Transaction ID from your JazzCash payment (6–30 letters/numbers)' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { orderNumber } })
    if (!order || order.customerId !== customer.id) {
      return noStoreJson({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'CANCELLED') return noStoreJson({ error: 'This order was cancelled' }, { status: 400 })
    if (order.paymentStatus === 'PAID') return noStoreJson({ error: 'This order is already paid' }, { status: 400 })
    if (order.paymentStatus === 'VERIFYING') {
      return noStoreJson({ error: 'Your payment is already being verified — we will email you soon.' }, { status: 400 })
    }

    const wait = await rateLimit(`resubmit:${customer.id}`, 10, 60 * 60 * 1000)
    if (wait > 0) {
      return noStoreJson({ error: 'Too many attempts. Please try again later.', retryAfter: wait }, { status: 429 })
    }

    // A rejected TID can never be reused — the owner already found it invalid.
    if (tid === order.txnRef) {
      return noStoreJson(
        { error: 'This Transaction ID was already rejected. Please enter the correct TID from your JazzCash payment.', code: 'TID_REJECTED' },
        { status: 400 }
      )
    }

    try {
      await db.paymentTxn.create({ data: { txn: tid, orderNumber } })
      reserved = tid
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        return noStoreJson(
          { error: 'This Transaction ID has already been used for an order. Please check it and try again.', code: 'TID_USED' },
          { status: 409 }
        )
      }
      throw e
    }

    // Atomic: only moves the order to "verifying" if nobody changed it in the meantime
    const moved = await db.order.updateMany({
      where: { orderNumber, paymentStatus: { in: ['PENDING', 'REJECTED'] } },
      data: { paymentStatus: 'VERIFYING', senderNumber: sender, txnRef: tid },
    })
    if (moved.count !== 1) {
      await db.paymentTxn.deleteMany({ where: { txn: tid } }).catch(() => {})
      reserved = null
      return noStoreJson({ error: 'This order can no longer be changed.' }, { status: 409 })
    }
    reserved = null
    const updated = await db.order.findUniqueOrThrow({ where: { orderNumber } })

    await audit({
      actor: `customer:${customer.email}`,
      action: 'customer.payment.resubmitted',
      target: orderNumber,
      ip: clientIp(req),
      detail: `new TID ${tid}`,
    })
    try {
      await sendOwnerPaymentAlert(updated, 'SUBMITTED')
    } catch (mailError) {
      console.error('owner payment alert email error:', mailError)
    }
    return noStoreJson({ order: updated })
  } catch (error) {
    console.error('POST /api/payments/submit error:', error)
    if (reserved) await db.paymentTxn.deleteMany({ where: { txn: reserved } }).catch(() => {})
    return noStoreJson({ error: 'Failed to submit payment details' }, { status: 500 })
  }
}
