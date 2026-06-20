import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'coachfit-session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'coachfit-secret-dev-change-in-production'

// Hash simple para el token de sesión (no es JWT pero funciona para MVP)
export function hashToken(payload: string): string {
  return bcrypt.hashSync(payload + SESSION_SECRET, 10)
}

export function verifyToken(token: string, payload: string): boolean {
  try {
    return bcrypt.compareSync(payload + SESSION_SECRET, token)
  } catch {
    return false
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  // Token = userId + timestamp + random, hasheado
  const payload = `${userId}:${Date.now()}:${Math.random()}`
  const token = hashToken(payload)
  // Guardamos en DB como sesión simple
  // Para MVP, el token contiene el userId hasheado
  // En producción real, usar JWT o sesiones en DB
  return Buffer.from(`${userId}:${token}`).toString('base64')
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionCookie) return null

    // Decodificar
    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8')
    const [userId, token] = decoded.split(':')
    if (!userId || !token) return null

    // Verificar que el usuario existe
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return null

    return userId
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
