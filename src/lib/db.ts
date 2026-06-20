import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // Modo Turso (nube) - Vercel/producción
  if (tursoUrl && tursoUrl.startsWith('libsql:') && tursoToken) {
    try {
      // IMPORTANTE: PrismaLibSQL acepta { url, authToken } directamente,
      // NO un cliente libsql creado aparte
      const adapter = new PrismaLibSQL({
        url: tursoUrl,
        authToken: tursoToken,
      } as any)
      return new PrismaClient({ adapter })
    } catch (e) {
      console.error('Turso adapter error, falling back to local:', e)
    }
  }

  // Modo SQLite local (desarrollo / APK)
  // DATABASE_URL = file:./db/local.db
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
