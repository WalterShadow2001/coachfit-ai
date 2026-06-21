import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * GET /api/strava/callback
 * Strava redirige aquí con el código. Intercambiamos por tokens.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?strava_error=' + error, req.url))
  }

  if (!code) {
    return NextResponse.json({ error: 'Falta código' }, { status: 400 })
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Strava no configurado' }, { status: 500 })
  }

  // Intercambiar código por tokens
  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    console.error('Strava token error:', err)
    return NextResponse.redirect(new URL('/?strava_error=token_exchange', req.url))
  }

  const tokens = await tokenResponse.json()
  // tokens: { access_token, refresh_token, expires_at, athlete: { id, username, firstname, lastname, profile } }

  // Guardar tokens en localStorage del cliente via redirect
  const redirectUrl = new URL('/', req.url)
  redirectUrl.searchParams.set('strava_connected', 'true')
  redirectUrl.searchParams.set('strava_access_token', tokens.access_token)
  redirectUrl.searchParams.set('strava_refresh_token', tokens.refresh_token || '')
  redirectUrl.searchParams.set('strava_expires_at', String(tokens.expires_at || 0))

  return NextResponse.redirect(redirectUrl)
}
