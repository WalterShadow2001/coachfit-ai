import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'coachfit-session'
const REMEMBER_COOKIE = 'coachfit-remember'
const SESSION_SECRET = process.env.SESSION_SECRET || 'coachfit-secret-dev-change-in-production'

// Duraciones
const SESSION_DURATION_SHORT = 4 * 60 * 60 // 4 horas (sin "recordarme")
const SESSION_DURATION_LONG = 30 * 24 * 60 * 60 // 30 días (con "recordarme")

// Estructura del token: base64(userId:expiresAt:signature)
// La firma es un hash del userId + expiresAt + secret

function signToken(userId: string, expiresAt: number): string {
  const payload = `${userId}:${expiresAt}`
  const signature = bcrypt.hashSync(payload + SESSION_SECRET, 10)
  const token = Buffer.from(`${payload}:${signature}`).toString('base64')
  return token
}

function verifyToken(token: string): { userId: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length < 3) return null

    const userId = parts[0]
    const expiresAt = parseInt(parts[1], 10)
    const signature = parts.slice(2).join(':')

    // Verificar expiración
    if (Date.now() > expiresAt) return null

    // Verificar firma
    const payload = `${userId}:${expiresAt}`
    if (!bcrypt.compareSync(payload + SESSION_SECRET, signature)) return null

    return { userId, expiresAt }
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string, remember: boolean = false): Promise<string> {
  const duration = remember ? SESSION_DURATION_LONG : SESSION_DURATION_SHORT
  const expiresAt = Date.now() + duration * 1000
  return signToken(userId, expiresAt)
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()

    // Intentar cookie de sesión primero
    let sessionCookie = cookieStore.get(SESSION_COOKIE)?.value

    // Si no hay sesión, intentar cookie de "recordarme"
    if (!sessionCookie) {
      const rememberCookie = cookieStore.get(REMEMBER_COOKIE)?.value
      if (!rememberCookie) return null

      const verified = verifyToken(rememberCookie)
      if (!verified) return null

      // Si la cookie de "recordarme" es válida, recrear sesión
      const user = await db.user.findUnique({ where: { id: verified.userId } })
      if (!user) return null

      // Crear nueva sesión corta
      const newToken = await createSession(user.id, false)
      await setSessionCookie(newToken, false)
      return user.id
    }

    const verified = verifyToken(sessionCookie)
    if (!verified) return null

    // Verificar que el usuario existe
    const user = await db.user.findUnique({ where: { id: verified.userId } })
    if (!user) return null

    return verified.userId
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string, remember: boolean) {
  const cookieStore = await cookies()
  const maxAge = remember ? SESSION_DURATION_LONG : SESSION_DURATION_SHORT

  // Cookie de sesión (siempre)
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })

  // Cookie de "recordarme" (solo si el usuario la quiere)
  if (remember) {
    cookieStore.set(REMEMBER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_LONG,
      path: '/',
    })
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(REMEMBER_COOKIE)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
