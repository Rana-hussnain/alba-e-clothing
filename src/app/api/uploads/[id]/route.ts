import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/** Public: serves an uploaded product image (reached through the /uploads/:id rewrite). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!/^[a-f0-9]{24}$/i.test(id)) return new NextResponse('Not found', { status: 404 })
  try {
    const img = await db.uploadedImage.findUnique({ where: { id } })
    if (!img) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(new Uint8Array(img.data), {
      headers: {
        'Content-Type': img.mime,
        'Content-Length': String(img.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (error) {
    console.error('GET /api/uploads error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}
