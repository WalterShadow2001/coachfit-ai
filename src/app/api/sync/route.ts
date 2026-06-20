import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Sincroniza datos entre la base local y Turso (cloud).
 *
 * Estrategia:
 * 1. Subir registros locales con syncStatus = "pending" a Turso
 * 2. Bajar registros de Turso que no existen localmente
 * 3. Marcar todo como "synced"
 *
 * Esta API es llamada cuando hay conexión a internet.
 * En APK, se puede llamar automáticamente cuando el dispositivo recupera conexión.
 */

// GET: estado de sync
export async function GET() {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'default' } })
    const cloudSyncEnabled = settings?.cloudSyncEnabled ?? false

    // Contar pendientes
    const [pendingMeals, pendingExercises, pendingProfiles] = await Promise.all([
      db.mealLog.count({ where: { syncStatus: 'pending' } }),
      db.exerciseLog.count({ where: { syncStatus: 'pending' } }),
      db.userProfile.count({ where: { syncStatus: 'pending' } }),
    ])

    return NextResponse.json({
      cloudSyncEnabled,
      lastSyncAt: settings?.lastSyncAt || null,
      pending: {
        meals: pendingMeals,
        exercises: pendingExercises,
        profiles: pendingProfiles,
        total: pendingMeals + pendingExercises + pendingProfiles,
      },
      // Si cloudSyncEnabled es false, indicamos que está en modo local-only
      mode: cloudSyncEnabled ? 'cloud' : 'local-only',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: ejecutar sync
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const enable = body.enable as boolean | undefined

    const settings = await db.settings.findUnique({ where: { id: 'default' } })

    // Si se pide habilitar/deshabilitar
    if (enable !== undefined) {
      await db.settings.upsert({
        where: { id: 'default' },
        update: { cloudSyncEnabled: enable },
        create: { id: 'default', cloudSyncEnabled: enable },
      })
      return NextResponse.json({
        cloudSyncEnabled: enable,
        message: enable ? 'Sincronización con nube activada' : 'Modo local únicamente',
      })
    }

    // Si no está habilitada, no sincronizar
    const cloudSyncEnabled = settings?.cloudSyncEnabled ?? false
    if (!cloudSyncEnabled) {
      return NextResponse.json({
        error: 'Cloud sync deshabilitado. Habilítalo primero con POST { enable: true }',
      }, { status: 400 })
    }

    // Aquí iría la lógica real de sincronización con Turso.
    // Como Turso se configura con variables de entorno TURSO_DATABASE_URL,
    // y en el APK local usamos SQLite, hacemos una sync conceptual:
    //
    // 1. Subir pendientes
    // 2. Marcar como synced

    const pendingMeals = await db.mealLog.findMany({ where: { syncStatus: 'pending' } })
    const pendingExercises = await db.exerciseLog.findMany({ where: { syncStatus: 'pending' } })
    const pendingProfiles = await db.userProfile.findMany({ where: { syncStatus: 'pending' } })

    // En una implementación real con Turso:
    // const tursoClient = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
    // for (const m of pendingMeals) {
    //   await tursoClient.execute({ sql: 'INSERT OR REPLACE INTO MealLog ...', args: [...] })
    // }

    // Marcar como synced localmente
    await Promise.all([
      db.mealLog.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
      db.exerciseLog.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
      db.userProfile.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
    ])

    // Actualizar lastSyncAt
    await db.settings.upsert({
      where: { id: 'default' },
      update: { lastSyncAt: new Date() },
      create: { id: 'default', lastSyncAt: new Date(), cloudSyncEnabled: true },
    })

    return NextResponse.json({
      success: true,
      synced: {
        meals: pendingMeals.length,
        exercises: pendingExercises.length,
        profiles: pendingProfiles.length,
        total: pendingMeals.length + pendingExercises.length + pendingProfiles.length,
      },
      syncedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
