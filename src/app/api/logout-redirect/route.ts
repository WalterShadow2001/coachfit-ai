import { NextResponse } from 'next/server'
import { clearSessionCookie, getSessionUserId } from '@/lib/auth'

/**
 * GET /api/logout-redirect
 * Borra la sesión y redirige al login con cache-buster
 */
export async function GET() {
  await clearSessionCookie()
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'
  const redirectUrl = new URL('/', baseUrl)
  redirectUrl.searchParams.set('logged_out', 'true')
  redirectUrl.searchParams.set('_t', String(Date.now()))
  // Agregar headers anti-cache
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}
