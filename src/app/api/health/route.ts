import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health
 * Devuelve el estado de conexión con Samsung Health / Health Connect
 * y los datos de actividad del día
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const profile = await db.userProfile.findFirst()
    const settings = await db.settings.findUnique({ where: { id: 'default' } })

    // Datos de salud del día solicitado
    const healthData = await db.healthData.findUnique({
      where: { date: new Date(date + 'T00:00:00') },
    })

    // Últimos 7 días de datos
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekData = await db.healthData.findMany({
      where: { date: { gte: weekAgo } },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      connected: profile?.samsungHealthConnected || false,
      lastSync: profile?.samsungHealthLastSync || null,
      today: healthData ? {
        date: healthData.date,
        steps: healthData.steps,
        caloriesBurned: healthData.caloriesBurned,
        caloriesResting: healthData.caloriesResting,
        distanceMeters: healthData.distanceMeters,
        activeMinutes: healthData.activeMinutes,
        heartRateAvg: healthData.heartRateAvg,
        heartRateMax: healthData.heartRateMax,
        sleepHours: healthData.sleepHours,
        exercises: JSON.parse(healthData.exercises || '[]'),
      } : null,
      week: weekData.map(d => ({
        date: d.date,
        steps: d.steps,
        caloriesBurned: d.caloriesBurned,
        activeMinutes: d.activeMinutes,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/health
 * Guarda datos de actividad recibidos desde el cliente (que viene de Health Connect)
 * El cliente (Capacitor o web) envía los datos que obtiene del SDK nativo
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, steps, caloriesBurned, caloriesResting, distanceMeters, activeMinutes, heartRateAvg, heartRateMax, sleepHours, exercises, source } = body

    const dateStr = date || new Date().toISOString().slice(0, 10)
    const dateObj = new Date(dateStr + 'T00:00:00')

    // Upsert
    const healthData = await db.healthData.upsert({
      where: { date: dateObj },
      update: {
        steps: Number(steps) || 0,
        caloriesBurned: Number(caloriesBurned) || 0,
        caloriesResting: Number(caloriesResting) || 0,
        distanceMeters: Number(distanceMeters) || 0,
        activeMinutes: Number(activeMinutes) || 0,
        heartRateAvg: heartRateAvg ? Number(heartRateAvg) : null,
        heartRateMax: heartRateMax ? Number(heartRateMax) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        exercises: JSON.stringify(exercises || []),
        source: source || 'health_connect',
        syncStatus: 'pending',
        syncedAt: new Date(),
      },
      create: {
        date: dateObj,
        steps: Number(steps) || 0,
        caloriesBurned: Number(caloriesBurned) || 0,
        caloriesResting: Number(caloriesResting) || 0,
        distanceMeters: Number(distanceMeters) || 0,
        activeMinutes: Number(activeMinutes) || 0,
        heartRateAvg: heartRateAvg ? Number(heartRateAvg) : null,
        heartRateMax: heartRateMax ? Number(heartRateMax) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        exercises: JSON.stringify(exercises || []),
        source: source || 'health_connect',
      },
    })

    // Marcar perfil como conectado a Samsung Health
    const profile = await db.userProfile.findFirst()
    if (profile && !profile.samsungHealthConnected) {
      await db.userProfile.update({
        where: { id: profile.id },
        data: { samsungHealthConnected: true, samsungHealthLastSync: new Date() },
      })
    } else if (profile) {
      await db.userProfile.update({
        where: { id: profile.id },
        data: { samsungHealthLastSync: new Date() },
      })
    }

    // Si hay ejercicios registrados, crear ExerciseLogs automáticamente
    if (exercises && Array.isArray(exercises) && exercises.length > 0) {
      const startOfDay = new Date(dateStr + 'T00:00:00')
      const endOfDay = new Date(dateStr + 'T23:59:59')
      // Borrar logs previos de samsung_health de ese día
      await db.exerciseLog.deleteMany({
        where: {
          source: 'samsung_health',
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
      })
      for (const ex of exercises) {
        await db.exerciseLog.create({
          data: {
            actualName: ex.name || ex.type || 'Ejercicio',
            durationMin: Number(ex.duration) || 0,
            caloriesBurn: ex.calories ? Number(ex.calories) : null,
            intensity: ex.intensity || null,
            notes: `Detectado por Samsung Health`,
            onPlan: null,
            source: 'samsung_health',
            syncStatus: 'pending',
          },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      healthData,
      message: `Datos guardados: ${steps || 0} pasos, ${caloriesBurned || 0} kcal`,
    })
  } catch (e: any) {
    console.error('Health sync error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/health
 * Desconecta Samsung Health
 */
export async function DELETE() {
  try {
    const profile = await db.userProfile.findFirst()
    if (profile) {
      await db.userProfile.update({
        where: { id: profile.id },
        data: {
          samsungHealthConnected: false,
          samsungHealthLastSync: null,
        },
      })
    }
    return NextResponse.json({ ok: true, message: 'Samsung Health desconectado' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
