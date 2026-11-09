import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { clientIp, isAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED']

/** GET ?status=PENDING|APPROVED|REJECTED — reviews for moderation (admin only) */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const status = req.nextUrl.searchParams.get('status') ?? 'PENDING'
    const where = STATUSES.includes(status) ? { status } : {}
    const reviews = await db.review.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
    const products = await db.product.findMany({
      where: { id: { in: [...new Set(reviews.map((r) => r.productId))] } },
      select: { id: true, name: true },
    })
    const names = new Map(products.map((p) => [p.id, p.name]))
    const pending = await db.review.count({ where: { status: 'PENDING' } })
    return NextResponse.json(
      { reviews: reviews.map((r) => ({ ...r, productName: names.get(r.productId) ?? 'Deleted product' })), pending },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('GET /api/admin/reviews error:', error)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

/** PATCH { id, action: "APPROVE" | "REJECT" } — publish or hide a review (admin only) */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    const action = body?.action
    if (!/^[a-f0-9]{24}$/i.test(id) || (action !== 'APPROVE' && action !== 'REJECT')) {
      return NextResponse.json({ error: 'id and action (APPROVE or REJECT) are required' }, { status: 400 })
    }
    const existing = await db.review.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    const review = await db.review.update({
      where: { id },
      data: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedAt: new Date() },
    })
    await audit({
      actor: 'admin',
      action: action === 'APPROVE' ? 'admin.review.approve' : 'admin.review.reject',
      target: id,
      ip: clientIp(req),
      detail: `${existing.rating}★ by ${existing.name}`,
    })
    return NextResponse.json({ review })
  } catch (error) {
    console.error('PATCH /api/admin/reviews error:', error)
    return NextResponse.json({ error: 'Failed to update the review' }, { status: 500 })
  }
}
