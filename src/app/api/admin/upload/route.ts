import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { clientIp, isAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB

/** Detect the real image type from file signature (never trust the client's MIME / filename). SVG is deliberately not allowed. */
function sniffImage(b: Buffer): string | null {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (b.length > 6 && b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif'
  return null
}

/** POST multipart/form-data { file } → { path: "/uploads/<id>" } (admin only) */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const declared = Number(req.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Image is too large (max 3 MB)' }, { status: 413 })
    }
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }
    if (file.size === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 3 MB)' }, { status: 413 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const mime = sniffImage(buf)
    if (!mime) {
      return NextResponse.json({ error: 'Only PNG, JPG, WEBP or GIF images are allowed' }, { status: 400 })
    }
    const saved = await db.uploadedImage.create({ data: { mime, size: buf.length, data: buf } })
    await audit({ actor: 'admin', action: 'admin.image.upload', target: saved.id, ip: clientIp(req), detail: `${mime}, ${buf.length} bytes` })
    return NextResponse.json({ path: `/uploads/${saved.id}` }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
