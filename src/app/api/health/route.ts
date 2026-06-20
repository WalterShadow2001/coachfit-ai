import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health
 * Devuelve el estado de conexión con Samsung Health / Google Fit / Health Connect
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

    // Últimas muestras de ritmo cardíaco (últimos 10 min)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
    const heartRateSamples = await db.heartRateSample.findMany({
      where: { timestamp: { gte: tenMinAgo } },
      orderBy: { timestamp: 'desc' },
      take: 60,
    })

    // Última muestra de FC
    const latestHeartRate = heartRateSamples[0] || null

    return NextResponse.json({
      connected: {
        samsungHealth: profile?.samsungHealthConnected || false,
        googleFit: profile?.googleFitConnected || false,
        any: (profile?.samsungHealthConnected || false) || (profile?.googleFitConnected || false),
      },
      lastSync: {
        samsungHealth: profile?.samsungHealthLastSync || null,
        googleFit: profile?.googleFitLastSync || null,
      },
      heartRateMonitoring: profile?.heartRateMonitoring || false,
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
        source: healthData.source,
      } : null,
      week: weekData.map(d => ({
        date: d.date,
        steps: d.steps,
        caloriesBurned: d.caloriesBurned,
        activeMinutes: d.activeMinutes,
      })),
      heartRate: latestHeartRate ? {
        bpm: latestHeartRate.bpm,
        timestamp: latestHeartRate.timestamp,
        source: latestHeartRate.source,
      } : null,
      heartRateHistory: heartRateSamples.reverse().map(s => ({
        bpm: s.bpm,
        timestamp: s.timestamp,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/health
 * Guarda datos de actividad recibidos desde el cliente
 * body.source: "samsung_health" | "google_fit" | "manual" | "bluetooth"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, steps, caloriesBurned, caloriesResting, distanceMeters, activeMinutes, heartRateAvg, heartRateMax, sleepHours, exercises, source } = body

    const dateStr = date || new Date().toISOString().slice(0, 10)
    const dateObj = new Date(dateStr + 'T00:00:00')
    const sourceStr = source || 'manual'

    // Upsert health data
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
        source: sourceStr,
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
        source: sourceStr,
      },
    })

    // Marcar perfil como conectado según source
    const profile = await db.userProfile.findFirst()
    if (profile) {
      const update: any = {}
      if (sourceStr === 'samsung_health' || sourceStr === 'health_connect') {
        update.samsungHealthConnected = true
        update.samsungHealthLastSync = new Date()
      } else if (sourceStr === 'google_fit') {
        update.googleFitConnected = true
        update.googleFitLastSync = new Date()
      }
      if (Object.keys(update).length > 0) {
        await db.userProfile.update({ where: { id: profile.id }, data: update })
      }
    }

    // Si hay ejercicios registrados, crear ExerciseLogs automáticamente
    if (exercises && Array.isArray(exercises) && exercises.length > 0) {
      const startOfDay = new Date(dateStr + 'T00:00:00')
      const endOfDay = new Date(dateStr + 'T23:59:59')
      // Borrar logs previos de samsung_health/google_fit de ese día
      await db.exerciseLog.deleteMany({
        where: {
          source: { in: ['samsung_health', 'google_fit'] },
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
            notes: `Detectado por ${sourceStr}`,
            onPlan: null,
            source: sourceStr,
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
 * Desconecta el servicio indicado
 * body.source: "samsung_health" | "google_fit" (default: ambos)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source') || 'all'

    const profile = await db.userProfile.findFirst()
    if (profile) {
      const update: any = {}
      if (source === 'samsung_health' || source === 'all') {
        update.samsungHealthConnected = false
        update.samsungHealthLastSync = null
      }
      if (source === 'google_fit' || source === 'all') {
        update.googleFitConnected = false
        update.googleFitLastSync = null
      }
      await db.userProfile.update({ where: { id: profile.id }, data: update })
    }
    return NextResponse.json({ ok: true, message: `${source} desconectado` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
