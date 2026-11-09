import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { hashToken, siteBaseUrl } from '@/lib/customer-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET ?token=… — the link in the verification email. Marks the email as verified and returns to the store. */
export async function GET(req: NextRequest) {
  const base = siteBaseUrl(req)
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const back = (ok: boolean) => NextResponse.redirect(`${base}/?verified=${ok ? '1' : '0'}`, 303)

  if (token.length < 20 || token.length > 100) return back(false)
  try {
    const customer = await db.customer.findFirst({ where: { verifyTokenHash: hashToken(token) } })
    if (!customer || !customer.verifyExpires || customer.verifyExpires.getTime() < Date.now()) return back(false)
    await db.customer.update({
      where: { id: customer.id },
      data: { emailVerified: true, verifyTokenHash: null, verifyExpires: null },
    })
    await audit({ actor: `customer:${customer.email}`, action: 'customer.email.verified' })
    return back(true)
  } catch (error) {
    console.error('GET /api/auth/verify error:', error)
    return back(false)
  }
}
