import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { linesOfOrder, releaseStock, reserveStock } from '@/lib/stock'
import { sendOrderShippedEmail } from '@/lib/mail'
import { JAZZCASH_ACCOUNT_ID } from '@/lib/contact'
import { isMailLive, sendPaymentRejectedEmail, sendPaymentVerifiedEmail } from '@/lib/mail'
import { clientIp, isAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES: readonly string[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const isAuthorized = isAdminRequest

/**
 * GET /api/admin/orders
 * Auth: admin session cookie (see /api/admin/login)
 * Returns all orders (newest first) + summary stats for the owner dashboard.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orders = await db.order.findMany({ orderBy: { createdAt: 'desc' } })
    const emails = await db.emailLog.findMany({
      where: { orderNumber: { in: orders.map((o) => o.orderNumber) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, kind: true, to: true, subject: true, status: true, error: true, createdAt: true },
    })
    const emailsByOrder = new Map<string, typeof emails>()
    for (const e of emails) {
      const list = emailsByOrder.get(e.orderNumber) ?? []
      list.push(e)
      emailsByOrder.set(e.orderNumber, list)
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const active = orders.filter((o) => o.status !== 'CANCELLED')
    const open = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'SHIPPED')

    const stats = {
      total: orders.length,
      today: orders.filter((o) => new Date(o.createdAt) >= startOfDay).length,
      awaiting: orders.filter((o) => o.status === 'PENDING_PAYMENT').length,
      verifying: orders.filter(
        (o) => o.status === 'PENDING_PAYMENT' && o.paymentStatus === 'VERIFYING'
      ).length,
      open: open.length,
      delivered: orders.filter((o) => o.status === 'DELIVERED').length,
      revenue: active.reduce((s, o) => s + o.totalPayable, 0),
      paidRevenue: active
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((s, o) => s + o.totalPayable, 0),
      paidCount: orders.filter((o) => o.paymentStatus === 'PAID').length,
    }

    return NextResponse.json({
      orders: orders.map((o) => ({ ...o, emails: emailsByOrder.get(o.orderNumber) ?? [] })),
      stats,
      meta: {
        jazzcashAccount: JAZZCASH_ACCOUNT_ID,
        mailLive: isMailLive(),
        ownerEmail: process.env.OWNER_EMAIL?.trim() || 'albaeclothing@gmail.com',
      },
    })
  } catch (error) {
    console.error('GET /api/admin/orders error:', error)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/orders
 * Auth: admin session cookie
 * Body variants:
 *   { orderNumber, status }                 — PENDING_PAYMENT | CONFIRMED | SHIPPED | DELIVERED | CANCELLED
 *   { orderNumber, paymentAction: 'VERIFY' }  — customer's TID checked out → PAID + order CONFIRMED
 *   { orderNumber, paymentAction: 'REJECT' }  — TID not found → back to PENDING so the customer can resubmit
 *   { orderNumber, paymentAction: 'MARK_PAID' } — owner received payment outside the flow (e.g. WhatsApp proof)
 */
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const orderNumber: string = body?.orderNumber

    if (!orderNumber) {
      return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 })
    }

    const paymentAction: string | undefined = body?.paymentAction

    if (paymentAction) {
      const order = await db.order.findUnique({ where: { orderNumber } })
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      if (paymentAction === 'VERIFY' || paymentAction === 'MARK_PAID') {
        if (order.paymentStatus === 'PAID') {
          return NextResponse.json({ order }) // idempotent
        }
        const updated = await db.order.update({
          where: { orderNumber },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
            status: 'CONFIRMED', // full payment received → confirmed for dispatch
          },
        })
        await audit({ actor: 'admin', action: paymentAction === 'MARK_PAID' ? 'admin.payment.mark_paid' : 'admin.payment.verify', target: orderNumber, ip: clientIp(req), detail: `TID ${order.txnRef ?? '-'} · PKR ${order.totalPayable}` })
        // Tell the customer their payment was verified (never blocks the action)
        try {
          await sendPaymentVerifiedEmail(updated)
        } catch (mailError) {
          console.error('payment verified email error:', mailError)
        }
        return NextResponse.json({ order: updated })
      }

      if (paymentAction === 'REJECT') {
        if (order.paymentStatus !== 'VERIFYING') {
          return NextResponse.json(
            { error: 'Only orders with submitted payment details can be rejected' },
            { status: 400 }
          )
        }
        const updated = await db.order.update({
          where: { orderNumber },
          data: {
            paymentStatus: 'REJECTED',
            status: 'PENDING_PAYMENT',
          },
        })
        await audit({ actor: 'admin', action: 'admin.payment.reject', target: orderNumber, ip: clientIp(req), detail: `TID ${order.txnRef ?? '-'}` })
        // Ask the customer to re-check the TID and resubmit (never blocks the action)
        try {
          await sendPaymentRejectedEmail(updated)
        } catch (mailError) {
          console.error('payment rejected email error:', mailError)
        }
        return NextResponse.json({ order: updated })
      }

      return NextResponse.json(
        { error: 'paymentAction must be VERIFY, REJECT or MARK_PAID' },
        { status: 400 }
      )
    }

    const status: string = body?.status
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error:
            'A valid status (PENDING_PAYMENT, CONFIRMED, SHIPPED, DELIVERED, CANCELLED) is required',
        },
        { status: 400 }
      )
    }

    const before = await db.order.findUnique({ where: { orderNumber } })
    if (!before) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Courier + tracking number (optional, only when shipping)
    const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\w\s\-./]/g, '').trim().slice(0, 40) : '')
    const courier = status === 'SHIPPED' ? clean(body?.courier) : ''
    const trackingNumber = status === 'SHIPPED' ? clean(body?.trackingNumber) : ''

    // Keep stock honest: cancelling gives the pieces back; reopening a cancelled order takes them again
    if (status === 'CANCELLED' && before.status !== 'CANCELLED') {
      await releaseStock(linesOfOrder(before.itemsJson))
    } else if (before.status === 'CANCELLED' && status !== 'CANCELLED') {
      const again = await reserveStock(linesOfOrder(before.itemsJson))
      if (!again.ok) {
        return NextResponse.json(
          { error: `Cannot reopen: "${again.productName}" has only ${again.left} left in stock.` },
          { status: 409 }
        )
      }
    }

    const order = await db.order.update({
      where: { orderNumber },
      data: { status, ...(status === 'SHIPPED' ? { courier: courier || null, trackingNumber: trackingNumber || null } : {}) },
    })
    if (status === 'SHIPPED' && before.status !== 'SHIPPED') {
      try {
        await sendOrderShippedEmail(order)
      } catch (mailError) {
        console.error('order shipped email error:', mailError)
      }
    }

    await audit({ actor: 'admin', action: 'admin.order.status', target: orderNumber, ip: clientIp(req), detail: `status → ${status}${trackingNumber ? ` · ${courier || 'courier'} ${trackingNumber}` : ''}` })
    return NextResponse.json({ order })
  } catch (error) {
    console.error('PATCH /api/admin/orders error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
