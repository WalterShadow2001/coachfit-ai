import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

/**
 * GET /api/logout-redirect
 * Borra la sesión y redirige al login
 * Se puede llamar directamente desde la URL del navegador
 */
export async function GET() {
  await clearSessionCookie()
  const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app')
  redirectUrl.searchParams.set('logged_out', 'true')
  redirectUrl.searchParams.set('_t', String(Date.now()))
  return NextResponse.redirect(redirectUrl)
}
