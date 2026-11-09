import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category')

    const products = await db.product.findMany({
      where: category && category !== 'all' ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    })

    // Real ratings from approved customer reviews (products without reviews get none)
    const groups = await db.review.groupBy({
      by: ['productId'],
      where: { status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    })
    const ratings = new Map(groups.map((g) => [g.productId, { average: g._avg.rating ?? 0, count: g._count._all }]))

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        ratingAverage: ratings.get(p.id)?.average ?? 0,
        ratingCount: ratings.get(p.id)?.count ?? 0,
      })),
    })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
