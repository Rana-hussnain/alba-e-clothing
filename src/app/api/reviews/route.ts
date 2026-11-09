import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import {
  clientIp,
  forbiddenOrigin,
  getSessionCustomer,
  noStoreJson,
  rateLimit,
  sameOriginOk,
} from '@/lib/customer-auth'
import { REVIEW_MIN_CHARS, cleanComment, publicName } from '@/lib/review-rules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** The signed-in customer's DELIVERED orders that contain this product (null if none). */
async function deliveredOrderFor(customerId: string, productId: string) {
  const orders = await db.order.findMany({
    where: { customerId, status: 'DELIVERED', paymentStatus: 'PAID' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    orders.find((o) => {
      try {
        return (JSON.parse(o.itemsJson) as Array<{ productId?: string }>).some((i) => i.productId === productId)
      } catch {
        return false
      }
    }) ?? null
  )
}

/**
 * GET /api/reviews?productId=…  → approved reviews of one product + summary (+ what the signed-in customer may do)
 * GET /api/reviews?limit=3       → latest approved reviews across the shop (home page)
 */
export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
      const limit = Math.min(12, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 3))
      const reviews = await db.review.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { name: true, city: true, rating: true, comment: true, createdAt: true },
      })
      return noStoreJson({ reviews })
    }
    if (!OBJECT_ID.test(productId)) return noStoreJson({ error: 'Invalid product' }, { status: 400 })

    const [reviews, agg] = await Promise.all([
      db.review.findMany({
        where: { productId, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { name: true, city: true, rating: true, comment: true, createdAt: true },
      }),
      db.review.aggregate({ where: { productId, status: 'APPROVED' }, _avg: { rating: true }, _count: { _all: true } }),
    ])

    // What may the signed-in customer do here?
    let mine: { status: string; rating: number; comment: string } | null = null
    let canReview = false
    const customer = await getSessionCustomer(req)
    if (customer) {
      const existing = await db.review.findUnique({
        where: { productId_customerId: { productId, customerId: customer.id } },
      })
      if (existing) mine = { status: existing.status, rating: existing.rating, comment: existing.comment }
      else canReview = Boolean(await deliveredOrderFor(customer.id, productId))
    }

    return noStoreJson({
      reviews,
      summary: { average: agg._avg.rating ?? 0, count: agg._count._all },
      mine,
      canReview,
      signedIn: Boolean(customer),
    })
  } catch (error) {
    console.error('GET /api/reviews error:', error)
    return noStoreJson({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

/** POST { productId, rating, comment } — a buyer reviews a product they received. Goes live after the owner approves it. */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const customer = await getSessionCustomer(req)
  if (!customer) return noStoreJson({ error: 'Please sign in to write a review.' }, { status: 401 })

  try {
    const body = (await req.json()) as Record<string, unknown>
    const productId = typeof body.productId === 'string' ? body.productId : ''
    const rating = Number(body.rating)
    const comment = cleanComment(body.comment)

    if (!OBJECT_ID.test(productId)) return noStoreJson({ error: 'Invalid product' }, { status: 400 })
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return noStoreJson({ error: 'Please choose a rating from 1 to 5 stars.' }, { status: 400 })
    }
    if (comment.length < REVIEW_MIN_CHARS) {
      return noStoreJson({ error: `Please write at least ${REVIEW_MIN_CHARS} characters.` }, { status: 400 })
    }

    const wait = await rateLimit(`review:${customer.id}`, 10, 60 * 60 * 1000)
    if (wait > 0) return noStoreJson({ error: 'Too many attempts. Please try again later.' }, { status: 429 })

    const order = await deliveredOrderFor(customer.id, productId)
    if (!order) {
      return noStoreJson(
        { error: 'Only customers who have received this product can review it.' },
        { status: 403 }
      )
    }

    try {
      await db.review.create({
        data: {
          productId,
          customerId: customer.id,
          orderNumber: order.orderNumber,
          name: publicName(customer.name),
          city: order.city.slice(0, 40),
          rating,
          comment,
        },
      })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        return noStoreJson({ error: 'You have already reviewed this product.' }, { status: 409 })
      }
      throw e
    }

    await audit({
      actor: `customer:${customer.email}`,
      action: 'customer.review.submitted',
      target: productId,
      ip: clientIp(req),
      detail: `${rating}★ · order ${order.orderNumber}`,
    })
    return noStoreJson({ ok: true, message: 'Thank you! Your review will appear once it has been approved.' }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return noStoreJson({ error: 'Could not save your review. Please try again.' }, { status: 500 })
  }
}
