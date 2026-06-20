import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

// GET: estado de sync
export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })
    const cloudSyncEnabled = settings?.cloudSyncEnabled ?? false

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
      mode: cloudSyncEnabled ? 'cloud' : 'local-only',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: ejecutar sync
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const enable = body.enable as boolean | undefined

    if (enable !== undefined) {
      await db.settings.upsert({
        where: { id: `default-${userId}` },
        update: { cloudSyncEnabled: enable },
        create: { id: `default-${userId}`, cloudSyncEnabled: enable },
      })
      return NextResponse.json({
        cloudSyncEnabled: enable,
        message: enable ? 'Sincronización con nube activada' : 'Modo local únicamente',
      })
    }

    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })
    const cloudSyncEnabled = settings?.cloudSyncEnabled ?? false
    if (!cloudSyncEnabled) {
      return NextResponse.json({ error: 'Cloud sync deshabilitado' }, { status: 400 })
    }

    const pendingMeals = await db.mealLog.findMany({ where: { syncStatus: 'pending' } })
    const pendingExercises = await db.exerciseLog.findMany({ where: { syncStatus: 'pending' } })
    const pendingProfiles = await db.userProfile.findMany({ where: { syncStatus: 'pending' } })

    await Promise.all([
      db.mealLog.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
      db.exerciseLog.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
      db.userProfile.updateMany({ where: { syncStatus: 'pending' }, data: { syncStatus: 'synced' } }),
    ])

    await db.settings.upsert({
      where: { id: `default-${userId}` },
      update: { lastSyncAt: new Date() },
      create: { id: `default-${userId}`, lastSyncAt: new Date(), cloudSyncEnabled: true },
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
