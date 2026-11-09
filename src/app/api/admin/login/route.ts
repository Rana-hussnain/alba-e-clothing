import { audit, auditOncePer } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  checkCredentials,
  clearFailedLogins,
  clientIp,
  createSessionToken,
  getAdminConfig,
  getLockSeconds,
  isAdminRequest,
  recordFailedLogin,
  sessionCookieOptions,
  SESSION_MAX_AGE_S,
} from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function locked(seconds: number) {
  const minutes = Math.ceil(seconds / 60)
  return NextResponse.json(
    {
      error: `Too many wrong attempts. Login is locked — try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      locked: true,
      retryAfter: seconds,
    },
    { status: 429, headers: { 'Retry-After': String(seconds), 'Cache-Control': 'no-store' } }
  )
}

/** GET — is the current cookie a valid admin session? */
export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(req) }, { headers: { 'Cache-Control': 'no-store' } })
}

/** POST { username, password } — sign in */
export async function POST(req: NextRequest) {
  const cfg = getAdminConfig()
  if (!cfg) {
    console.error(
      'Admin login is not configured: set ADMIN_USERNAME, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET (32+ chars) in .env'
    )
    return NextResponse.json({ error: 'Admin login is not configured on the server.' }, { status: 503 })
  }

  let body: { username?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 100 || password.length > 200) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  const ip = clientIp(req)

  try {
    const lockSeconds = await getLockSeconds(ip)
    if (lockSeconds > 0) {
      await auditOncePer({ actor: 'visitor', action: 'admin.login.blocked', ip, detail: 'sign-in locked' }, 15 * 60 * 1000)
      return locked(lockSeconds)
    }

    const { ok, usernameMatched } = await checkCredentials(cfg, username, password)

    if (!ok) {
      const result = await recordFailedLogin(ip, usernameMatched)
      await audit({ actor: 'visitor', action: 'admin.login.failed', ip, detail: result.lockSeconds > 0 ? 'now locked' : `${result.attemptsLeft} attempts left` })
      if (result.lockSeconds > 0) return locked(result.lockSeconds)
      return NextResponse.json(
        {
          error: `Wrong username or password. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before login is locked.`,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    await clearFailedLogins(ip)
    await audit({ actor: 'admin', action: 'admin.login', ip })
    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    res.cookies.set(SESSION_COOKIE, createSessionToken(cfg), sessionCookieOptions(SESSION_MAX_AGE_S))
    return res
  } catch (error) {
    // Fail closed: if the lockout store is unreachable we do NOT let anyone in.
    console.error('POST /api/admin/login error (did you run `npx prisma db push`?):', error)
    return NextResponse.json({ error: 'Login is temporarily unavailable' }, { status: 503 })
  }
}

/** DELETE — sign out */
export async function DELETE(req: NextRequest) {
  if (isAdminRequest(req)) await audit({ actor: 'admin', action: 'admin.logout', ip: clientIp(req) })
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return res
}
