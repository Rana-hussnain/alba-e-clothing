import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { sendOrderEmails } from '@/lib/mail'
import {
  clientIp,
  forbiddenOrigin,
  getSessionCustomer,
  noStoreJson,
  rateLimit,
  sameOriginOk,
  verificationRequired,
} from '@/lib/customer-auth'
import { releaseStock, reserveStock, type StockLine } from '@/lib/stock'
import { normalizeTid, validSenderNumber, validTid } from '@/lib/payment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SHIPPING_CHARGES = 300 // PKR flat
const MAX_ITEMS = 30

type IncomingItem = { productId: string; qty: number; size: string }

function generateOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const stamp = Date.now().toString(36).slice(-4).toUpperCase()
  return `ALBA-${stamp}${rand}`
}

function sizesOf(raw: string): string[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/**
 * POST /api/orders — place an order. Requires a signed-in customer.
 *
 * Body: delivery details + { senderNumber, txnRef } (the customer has ALREADY paid the total to our
 * JazzCash number and enters the Transaction ID) + items.
 * The order is created as "payment verifying": the owner gets an email with the customer's details and
 * the TID, cross-checks it in the JazzCash app, and verifies it in the admin portal.
 * Prices always come from the database; the customer's email always comes from the verified account.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()

  const customer = await getSessionCustomer(req)
  if (!customer) {
    return noStoreJson({ error: 'Please sign in to place an order.', code: 'AUTH_REQUIRED' }, { status: 401 })
  }
  if (verificationRequired() && !customer.emailVerified) {
    return noStoreJson(
      { error: 'Please verify your email address first — check your inbox for the verification link.', code: 'EMAIL_UNVERIFIED' },
      { status: 403 }
    )
  }

  let reservedTxn: string | null = null
  let reservedStock: StockLine[] = []
  try {
    const body = (await req.json()) as Record<string, unknown>
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

    const firstName = str(body.firstName, 60)
    const lastName = str(body.lastName, 60)
    const address = str(body.address, 250)
    const city = str(body.city, 60)
    const contactNumber = str(body.contactNumber, 20)
    const postalCode = str(body.postalCode, 12)
    const senderNumber = str(body.senderNumber, 20).replace(/[\s-]/g, '')
    const txnRef = normalizeTid(body.txnRef)
    const items = body.items as IncomingItem[] | undefined

    // ---- Required field validation ----
    const missing: string[] = []
    if (!firstName) missing.push('First Name')
    if (!lastName) missing.push('Last Name')
    if (!address) missing.push('Address')
    if (!city) missing.push('City')
    if (!contactNumber) missing.push('Contact Number')
    if (!postalCode) missing.push('Postal Code')
    if (missing.length > 0) {
      return noStoreJson({ error: `Please fill in all required fields: ${missing.join(', ')}` }, { status: 400 })
    }
    if (!/^[0-9+\-\s()]{7,16}$/.test(contactNumber)) {
      return noStoreJson({ error: 'Please enter a valid Contact Number (e.g. 03001234567)' }, { status: 400 })
    }
    if (!validSenderNumber(senderNumber)) {
      return noStoreJson(
        { error: 'Enter the JazzCash mobile number you paid from, e.g. 03001234567' },
        { status: 400 }
      )
    }
    if (!validTid(txnRef)) {
      return noStoreJson(
        { error: 'Enter the Transaction ID (TID) from your JazzCash payment — 6 to 30 letters/numbers' },
        { status: 400 }
      )
    }
    if (!Array.isArray(items) || items.length === 0) {
      return noStoreJson({ error: 'Your cart is empty' }, { status: 400 })
    }
    if (items.length > MAX_ITEMS) {
      return noStoreJson({ error: 'Too many different items in one order' }, { status: 400 })
    }

    // ---- Anti-abuse: at most 10 order attempts per hour per account ----
    const wait = await rateLimit(`order:${customer.id}`, 10, 60 * 60 * 1000)
    if (wait > 0) {
      return noStoreJson(
        { error: 'Too many orders in a short time. Please try again later or contact us on WhatsApp.', retryAfter: wait },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    // ---- Recompute prices server-side from the database ----
    const productIds = [...new Set(items.map((i) => String(i?.productId ?? '')))]
    const dbProducts = await db.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(dbProducts.map((p) => [p.id, p]))

    const orderItems: Array<{ productId: string; name: string; category: string; size: string; qty: number; price: number; lineTotal: number }> = []
    for (const i of items) {
      const p = productMap.get(String(i?.productId ?? ''))
      if (!p) {
        return noStoreJson({ error: 'One of the items in your cart is no longer available' }, { status: 400 })
      }
      const sizes = sizesOf(p.sizes)
      const size = String(i.size ?? '')
      if (sizes.length > 0 && !sizes.includes(size)) {
        return noStoreJson({ error: `Size "${size}" is not available for ${p.name}` }, { status: 400 })
      }
      const qty = Math.max(1, Math.min(20, Math.floor(Number(i.qty) || 1)))
      orderItems.push({
        productId: p.id,
        name: p.name,
        category: p.category,
        size: size || 'Standard',
        qty,
        price: p.price,
        lineTotal: p.price * qty,
      })
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.lineTotal, 0)
    const shippingCharges = SHIPPING_CHARGES
    const totalPayable = subtotal + shippingCharges
    const orderNumber = generateOrderNumber()

    // ---- A Transaction ID can back ONE order only ----
    try {
      await db.paymentTxn.create({ data: { txn: txnRef, orderNumber } })
      reservedTxn = txnRef
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        return noStoreJson(
          {
            error:
              'This Transaction ID has already been used for another order. Please check the TID, or contact us on WhatsApp.',
            code: 'TID_USED',
          },
          { status: 409 }
        )
      }
      throw e
    }

    // ---- Take the pieces out of stock (atomic — the last piece can only be sold once) ----
    const stock = await reserveStock(orderItems.map((i) => ({ productId: i.productId, qty: i.qty })))
    if (!stock.ok) {
      await db.paymentTxn.deleteMany({ where: { txn: txnRef } }).catch(() => {})
      reservedTxn = null
      return noStoreJson(
        {
          error:
            stock.left === 0
              ? `Sorry, "${stock.productName}" just sold out. Please remove it from your cart. If you have already paid, WhatsApp us your TID and we will refund you in full.`
              : `Sorry, only ${stock.left} of "${stock.productName}" left. Please reduce the quantity. If you have already paid, WhatsApp us your TID and we will sort it out.`,
          code: 'OUT_OF_STOCK',
        },
        { status: 409 }
      )
    }
    reservedStock = stock.reserved

    const order = await db.order.create({
      data: {
        orderNumber,
        firstName,
        lastName,
        address,
        city,
        contactNumber,
        postalCode,
        email: customer.email, // the verified account email — confirmation always reaches the real owner of the account
        customerId: customer.id,
        itemsJson: JSON.stringify(orderItems),
        subtotal,
        shippingCharges,
        totalPayable,
        status: 'PENDING_PAYMENT',
        paymentMethod: 'JAZZCASH',
        paymentStatus: 'VERIFYING', // paid via JazzCash → waiting for the owner to cross-check the TID
        senderNumber,
        txnRef,
      },
    })
    reservedTxn = null // order saved — keep the TID reserved
    reservedStock = [] // …and the stock
    await audit({
      actor: `customer:${customer.email}`,
      action: 'customer.order.placed',
      target: orderNumber,
      ip: clientIp(req),
      detail: `PKR ${totalPayable} · TID ${txnRef} · from ${senderNumber}`,
    })

    // ---- Emails: customer receipt + owner notification with the customer's details and TID ----
    // Never blocks or fails the order — all errors are caught.
    try {
      await sendOrderEmails(order)
    } catch (mailError) {
      console.error('order confirmation email error:', mailError)
    }

    return noStoreJson({ order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    // Order did not get saved — free the TID and the stock so the customer can retry
    if (reservedTxn) await db.paymentTxn.deleteMany({ where: { txn: reservedTxn } }).catch(() => {})
    if (reservedStock.length > 0) await releaseStock(reservedStock)
    return noStoreJson({ error: 'Failed to place order. Please try again.' }, { status: 500 })
  }
}

/** GET /api/orders?orderNumber=… — one of the signed-in customer's own orders */
export async function GET(req: NextRequest) {
  const customer = await getSessionCustomer(req)
  if (!customer) return noStoreJson({ error: 'Please sign in' }, { status: 401 })

  const orderNumber = req.nextUrl.searchParams.get('orderNumber')
  if (!orderNumber) return noStoreJson({ error: 'orderNumber is required' }, { status: 400 })
  try {
    const order = await db.order.findUnique({ where: { orderNumber } })
    // Someone else's order looks exactly like a missing one
    if (!order || order.customerId !== customer.id) {
      return noStoreJson({ error: 'Order not found' }, { status: 404 })
    }
    return noStoreJson({ order })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return noStoreJson({ error: 'Failed to fetch order' }, { status: 500 })
  }
}
