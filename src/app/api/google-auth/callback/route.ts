import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'

/**
 * GET /api/google-auth/callback
 * Google redirige aquí con el código. Intercambiamos por tokens,
 * obtenemos info del usuario, y creamos/iniciamos sesión.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=' + error, req.url))
  }

  if (!code) {
    return NextResponse.json({ error: 'Falta código de autorización' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || 'https://coachfit-ai-phi.vercel.app'}/api/google-auth/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth no configurado' }, { status: 500 })
  }

  // 1. Intercambiar código por tokens
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
    return NextResponse.redirect(new URL('/?auth_error=token_exchange', req.url))
  }

  const tokens = await tokenResponse.json()

  // 2. Obtener info del usuario desde Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(new URL('/?auth_error=userinfo', req.url))
  }

  const googleUser = await userInfoResponse.json()
  // googleUser: { id, email, name, given_name, picture, verified_email }

  // 3. Buscar o crear usuario en nuestra DB
  let user = await db.user.findUnique({
    where: { email: googleUser.email.toLowerCase() },
  })

  if (!user) {
    // Crear usuario nuevo con datos de Google
    // Generar username del email (ej: carlos@gmail.com → carlos)
    const usernameBase = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
    let username = usernameBase
    let counter = 1
    while (await db.user.findUnique({ where: { username } })) {
      username = `${usernameBase}${counter}`
      counter++
    }

    // Crear password aleatorio (no se usa, pero el campo es requerido)
    const randomPassword = Math.random().toString(36).slice(-20) + Math.random().toString(36).slice(-20)
    const passwordHash = await hashPassword(randomPassword)

    user = await db.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        username,
        passwordHash,
        name: googleUser.name || googleUser.given_name || username,
      },
    })
  }

  // 4. Crear sesión
  const sessionToken = await createSession(user.id, true) // remember = true
  await setSessionCookie(sessionToken, true)

  // 5. Redirigir al dashboard con tokens de Google Fit en URL (para guardar en localStorage)
  const redirectUrl = new URL('/', req.url)
  redirectUrl.searchParams.set('google_auth_success', 'true')
  redirectUrl.searchParams.set('access_token', tokens.access_token)
  if (tokens.refresh_token) {
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token)
  }

  return NextResponse.redirect(redirectUrl)
}
