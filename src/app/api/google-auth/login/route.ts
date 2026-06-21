import { NextResponse } from 'next/server'

/**
 * GET /api/google-auth/login
 * Inicia el flujo de "Iniciar sesión con Google"
 * Redirige al usuario a Google para que autorice
 */
export async function GET() {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({
      error: 'Google OAuth no configurado',
      instructions: 'Ve a Vercel → Settings → Environment Variables y agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET',
    }, { status: 500 })
  }

  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'}/api/google-auth/callback`

  const scopes = [
    'openid',
    'email',
    'profile',
    // También pedimos permiso de Google Fit (para que un solo login haga todo)
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(authUrl.toString())
}
