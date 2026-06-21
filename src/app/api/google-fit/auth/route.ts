import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

/**
 * GET /api/google-fit/auth
 * Inicia el flujo OAuth de Google Fit
 * Redirige al usuario a la página de consentimiento de Google
 */
export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'}/api/google-fit/callback`

  if (!clientId) {
    return NextResponse.json({
      error: 'Google Fit no configurado. Necesitas crear un proyecto en Google Cloud Console.',
      instructions: [
        '1. Ve a https://console.cloud.google.com/',
        '2. Crea un proyecto nuevo',
        '3. Habilita "Fitness API" (Google Fit)',
        '4. Crea credenciales OAuth 2.0 (tipo: Web)',
        '5. Agrega como redirect URI: ' + redirectUri,
        '6. Copia el Client ID y Client Secret',
        '7. Configura las variables de entorno en Vercel:',
        '   GOOGLE_FIT_CLIENT_ID',
        '   GOOGLE_FIT_CLIENT_SECRET',
        '   GOOGLE_FIT_REDIRECT_URI',
      ],
    }, { status: 500 })
  }

  const scopes = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.nutrition.read',
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', userId)

  return NextResponse.redirect(authUrl.toString())
}
