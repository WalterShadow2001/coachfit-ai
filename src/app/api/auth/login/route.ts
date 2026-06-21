import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { emailOrUsername, password, remember } = body as {
      emailOrUsername: string
      password: string
      remember?: boolean
    }

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: 'Email/usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario por email o username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() },
        ],
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Verificar contraseña
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Crear sesión con duración según "remember"
    const rememberMe = Boolean(remember)
    const token = await createSession(user.id, rememberMe)
    await setSessionCookie(token, rememberMe)

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
