import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { clientIp, isAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const isAuthorized = isAdminRequest

type Category = 'kids' | 'men'

/** Subtypes available in the storefront category lists (catalog.ts) */
const KIDS_SUBTYPES = [
  'T-Shirts', 'Trousers', 'Cotton Pants', 'Jeans', 'Cargo Trousers',
  'Casual Shirts', 'Sweatshirts', 'Hoodies', 'Baggy Trousers',
]
const MEN_SUBTYPES = [
  'T-Shirts', 'Trousers', 'Cotton Pants', 'Jeans', 'Cargo Trousers',
  'Casual Shirts', 'Sweatshirts', 'Hoodies', 'Leather Belts', 'Baggy Trousers',
]

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
  return base || 'product'
}

interface ProductInput {
  name?: string
  category?: string
  subtype?: string
  description?: string
  price?: number
  image?: string
  sizes?: string[]
  colors?: string[]
  featured?: boolean
  /** pieces in stock; null = not tracked */
  stock?: number | null
}

function validateProduct(body: ProductInput, partial = false): string | null {
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) return 'Product name is required'
    if (body.name.trim().length > 120) return 'Product name is too long'
  }
  if (!partial || body.category !== undefined) {
    if (body.category !== 'kids' && body.category !== 'men') return 'Category must be kids or men'
  }
  if (!partial || body.subtype !== undefined) {
    if (!body.subtype?.trim()) return 'Subtype is required'
  }
  if (!partial || body.price !== undefined) {
    const p = Number(body.price)
    if (!Number.isFinite(p) || p < 1 || p > 500000) return 'Price must be between PKR 1 and PKR 500,000'
  }
  if (!partial || body.image !== undefined) {
    if (!body.image?.trim()) return 'Product image is required'
    const ok = body.image.startsWith('/') || body.image.startsWith('https://')
    if (!ok) return 'Image must be an uploaded file or an https:// URL'
  }
  if (body.stock !== undefined && body.stock !== null) {
    if (!Number.isInteger(body.stock) || body.stock < 0 || body.stock > 100000) {
      return 'Stock must be a whole number from 0 to 100,000 (leave it empty to not track stock)'
    }
  }
  return null
}

/** GET — list all products (including ones hidden from storefront logic if any) */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const products = await db.product.findMany({
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('GET /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

/** POST — create a product */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await req.json()) as ProductInput

    const err = validateProduct(body)
    if (err) return NextResponse.json({ error: err }, { status: 400 })

    const category = body.category as Category
    const allowed = category === 'kids' ? KIDS_SUBTYPES : MEN_SUBTYPES
    const subtype = body.subtype!.trim()
    if (!allowed.includes(subtype)) {
      return NextResponse.json(
        { error: `Subtype must be one of: ${allowed.join(', ')}` },
        { status: 400 }
      )
    }

    // Unique slug
    let slug = slugify(body.name!)
    const clash = await db.product.findUnique({ where: { slug } })
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    const product = await db.product.create({
      data: {
        slug,
        name: body.name!.trim(),
        category,
        subtype,
        description: body.description?.trim() || `${body.name!.trim()} — new arrival at ALBA-E.`,
        price: Math.round(Number(body.price)),
        image: body.image!.trim(),
        sizes: JSON.stringify(body.sizes?.length ? body.sizes : (category === 'kids'
          ? ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y']
          : ['S', 'M', 'L', 'XL', 'XXL'])),
        colors: JSON.stringify(body.colors?.length ? body.colors : ['Black', 'White']),
        featured: Boolean(body.featured),
        stock: body.stock ?? null,
      },
    })

    await audit({ actor: 'admin', action: 'admin.product.create', target: product.id, ip: clientIp(req), detail: product.name })
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

/** PATCH — update a product (by id) */
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id, ...body } = (await req.json()) as ProductInput & { id?: string }
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 })

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const err = validateProduct(body, true)
    if (err) return NextResponse.json({ error: err }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.category !== undefined) data.category = body.category
    if (body.subtype !== undefined) data.subtype = body.subtype.trim()
    if (body.description !== undefined) data.description = body.description.trim()
    if (body.price !== undefined) data.price = Math.round(Number(body.price))
    if (body.image !== undefined) data.image = body.image.trim()
    if (body.sizes !== undefined) data.sizes = JSON.stringify(body.sizes)
    if (body.colors !== undefined) data.colors = JSON.stringify(body.colors)
    if (body.featured !== undefined) data.featured = Boolean(body.featured)
    if (body.stock !== undefined) data.stock = body.stock

    const product = await db.product.update({ where: { id }, data })
    await audit({ actor: 'admin', action: 'admin.product.update', target: id, ip: clientIp(req), detail: product.name })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('PATCH /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

/** DELETE — remove a product (by id, via query param) */
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 })

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    await db.product.delete({ where: { id } })
    await audit({ actor: 'admin', action: 'admin.product.delete', target: id, ip: clientIp(req), detail: existing.name })
    return NextResponse.json({ ok: true, deleted: existing.name })
  } catch (error) {
    console.error('DELETE /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
