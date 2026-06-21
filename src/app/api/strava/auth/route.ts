import { NextResponse } from 'next/server'

/**
 * GET /api/strava/auth
 * Inicia el flujo OAuth de Strava
 * Strava tiene una API REST completa para leer ejercicios reales
 */
export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({
      error: 'Strava no configurado',
      instructions: [
        '1. Ve a https://www.strava.com/settings/api',
        '2. Crea una aplicación (necesitas cuenta de Strava)',
        '3. Nombre: CoachFit AI',
        '4. Sitio web: https://coachfit-ai-phi.vercel.app',
        '5. Authorization Callback Domain: coachfit-ai-phi.vercel.app',
        '6. Copia Client ID y Client Secret',
        '7. Agrega en Vercel: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET',
      ],
    }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'}/api/strava/callback`

  const authUrl = new URL('https://www.strava.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('approval_prompt', 'auto')
  authUrl.searchParams.set('scope', 'read,activity:read_all,profile:read_all')

  return NextResponse.redirect(authUrl.toString())
}
