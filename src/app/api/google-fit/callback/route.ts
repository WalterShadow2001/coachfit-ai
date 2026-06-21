import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/google-fit/callback
 * Callback de OAuth - Google redirige aquí con el código de autorización
 * Intercambiamos el código por tokens de acceso y refresh
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?google_fit_error=' + error, req.url))
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'}/api/google-fit/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google Fit no configurado' }, { status: 500 })
  }

  // Intercambiar código por tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    console.error('Token exchange error:', err)
    return NextResponse.redirect(new URL('/?google_fit_error=token_exchange', req.url))
  }

  const tokens = await tokenResponse.json()

  // Guardar tokens en el perfil del usuario
  const profile = await db.userProfile.findFirst({ where: { userId: state } })
  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Guardar tokens (en producción real, encriptar)
  await db.userProfile.update({
    where: { id: profile.id },
    data: {
      googleFitConnected: true,
      googleFitLastSync: new Date(),
      // Guardar tokens en campos existentes o crear nuevos
      // Por ahora usamos el campo restrictions para guardar el token (hack temporal)
      // En producción real, crear campos separados en el schema
    },
  })

  // Guardar tokens en Settings como JSON
  const settingsId = `default-${state}`
  const existingSettings = await db.settings.findUnique({ where: { id: settingsId } })

  // Guardar tokens en un campo temporal - en producción real, agregar al schema
  // Por ahora usamos localStorage en el cliente via redirect con parámetros
  const redirectUrl = new URL('/', req.url)
  redirectUrl.searchParams.set('google_fit_connected', 'true')
  redirectUrl.searchParams.set('access_token', tokens.access_token)
  if (tokens.refresh_token) {
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token)
  }
  redirectUrl.searchParams.set('expires_in', String(tokens.expires_in || 3600))

  return NextResponse.redirect(redirectUrl)
}
