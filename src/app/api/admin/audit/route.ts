import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clientIp, isAdminRequest } from '@/lib/admin-auth'
import { audit, verifyAuditChain } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 100

/** GET /api/admin/audit?filter=all|admin|customer|security — newest first; ?verify=1 checks the whole chain (admin only, read-only) */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    if (req.nextUrl.searchParams.get('verify') === '1') {
      const report = await verifyAuditChain()
      await audit({
        actor: 'admin',
        action: report.ok ? 'admin.audit.verified' : 'admin.audit.TAMPERING_DETECTED',
        ip: clientIp(req),
        detail: report.ok ? `${report.total} entries intact` : `${report.problem}`,
      })
      return NextResponse.json({ report }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
    const where =
      filter === 'admin'
        ? { action: { startsWith: 'admin.' } }
        : filter === 'customer'
          ? { action: { startsWith: 'customer.' } }
          : filter === 'security'
            ? { OR: [{ action: { contains: 'failed' } }, { action: { contains: 'blocked' } }, { action: { contains: 'password' } }] }
            : {}
    const logs = await db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE_SIZE })
    return NextResponse.json({ logs }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET /api/admin/audit error:', error)
    return NextResponse.json({ error: 'Failed to load the audit log' }, { status: 500 })
  }
}
