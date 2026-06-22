import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

/**
 * GET /api/google-auth/callback
 * Google redirige aquí con el código. Intercambiamos por tokens,
 * obtenemos info del usuario, creamos/iniciamos sesión,
 * Y GUARDAMOS LOS TOKENS EN LA BASE DE DATOS (no localStorage).
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
    return NextResponse.redirect(new URL('/?auth_error=token_exchange_failed', req.url))
  }

  const tokens = await tokenResponse.json()
  // tokens: { access_token, refresh_token, expires_in, scope, token_type }

  if (!tokens.access_token) {
    return NextResponse.redirect(new URL('/?auth_error=no_access_token', req.url))
  }

  // 2. Obtener info del usuario desde Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(new URL('/?auth_error=userinfo_failed', req.url))
  }

  const googleUser = await userInfoResponse.json()

  // 3. Buscar o crear usuario en nuestra DB
  let user = await db.user.findUnique({
    where: { email: googleUser.email.toLowerCase() },
  })

  if (!user) {
    const usernameBase = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
    let username = usernameBase
    let counter = 1
    while (await db.user.findUnique({ where: { username } })) {
      username = `${usernameBase}${counter}`
      counter++
    }

    const randomPassword = Math.random().toString(36).slice(-20) + Math.random().toString(36).slice(-20)
    const passwordHash = await bcrypt.hash(randomPassword, 10)

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
  const sessionToken = await createSession(user.id, true)
  await setSessionCookie(sessionToken, true)

  // 5. GUARDAR TOKENS EN LA BASE DE DATOS
  const expiryTime = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600)

  const profile = await db.userProfile.findFirst({ where: { userId: user.id } })
  if (profile) {
    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        googleFitAccessToken: tokens.access_token,
        googleFitRefreshToken: tokens.refresh_token || profile.googleFitRefreshToken,
        googleFitTokenExpiry: expiryTime,
      },
    })
  }

  // 6. HACER SINCRONIZACIÓN INMEDIATA para verificar que funciona
  try {
    const syncResponse = await fetch(`https://coachfit-ai-phi.vercel.app/api/google-fit/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: tokens.access_token, userId: user.id }),
    })
    const syncData = await syncResponse.json()
    console.log('Auto-sync result:', syncData)

    // Solo marcar como conectado si la sincronización fue exitosa
    if (syncData.ok) {
      const profile2 = await db.userProfile.findFirst({ where: { userId: user.id } })
      if (profile2) {
        await db.userProfile.update({
          where: { id: profile2.id },
          data: {
            googleFitConnected: true,
            googleFitLastSync: new Date(),
          },
        })
      }
    }
  } catch (syncError) {
    console.error('Auto-sync failed:', syncError)
    // No marcamos como conectado si falló
  }

  // 7. Redirigir al dashboard
  const redirectUrl = new URL('/', req.url)
  redirectUrl.searchParams.set('google_auth_success', 'true')
  return NextResponse.redirect(redirectUrl)
}
