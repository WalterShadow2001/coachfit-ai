import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, username, password, name } = body as {
      email: string
      username: string
      password: string
      name?: string
    }

    // Validaciones
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'El usuario debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    // Verificar email único
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email' },
        { status: 400 }
      )
    }

    // Verificar username único
    const existingUsername = await db.user.findUnique({ where: { username: username.toLowerCase() } })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Este usuario ya está tomado' },
        { status: 400 }
      )
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password)

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        name: name || username,
      },
    })

    // Crear sesión
    const token = await createSession(user.id)
    await setSessionCookie(token)

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
    console.error('Register error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
