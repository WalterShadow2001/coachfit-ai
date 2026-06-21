import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * POST /api/strava/sync
 * Lee actividades recientes de Strava y las guarda
 * body: { accessToken }
 *
 * Strava API lee:
 * - Correr, ciclismo, natación, caminar, senderismo, pesas, yoga, etc.
 * - Duración, distancia, calorías, ritmo, elevación
 * - Mapa GPX de la ruta
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const { accessToken } = body as { accessToken: string }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token de Strava requerido' }, { status: 400 })
    }

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    // Leer actividades de los últimos 7 días
    const now = Math.floor(Date.now() / 1000)
    const weekAgo = now - (7 * 24 * 60 * 60)

    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${weekAgo}&per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!activitiesResponse.ok) {
      const err = await activitiesResponse.text()
      return NextResponse.json({ error: `Strava API error: ${err}` }, { status: 502 })
    }

    const activities = await activitiesResponse.json()

    // Mapear tipos de Strava a nombres legibles
    const typeMap: Record<string, string> = {
      Run: 'Correr', Ride: 'Ciclismo', Swim: 'Natación', Walk: 'Caminar',
      Hike: 'Senderismo', Workout: 'Entrenamiento', WeightTraining: 'Pesas',
      Yoga: 'Yoga', Crossfit: 'CrossFit', HIIT: 'HIIT', Elliptical: 'Elíptica',
      Rowing: 'Remo', Skiing: 'Esquí', Snowboard: 'Snowboard',
      IceSkate: 'Patinaje sobre hielo', InlineSkate: 'Patinaje',
      RockClimbing: 'Escalada', StairStepper: 'Escaladora',
      StandUpPaddling: 'SUP', Surfing: 'Surf', VirtualRide: 'Ciclismo virtual',
      VirtualRun: 'Correr virtual',
    }

    // Procesar actividades
    const exercises = activities.map((a: any) => ({
      name: a.name || typeMap[a.type] || a.type,
      type: typeMap[a.type] || a.type,
      duration: Math.round(a.moving_time / 60), // segundos → minutos
      calories: a.calories || null,
      distance: a.distance ? Math.round(a.distance) : null, // metros
      startDate: a.start_date,
      map: a.map?.summary_polyline || null,
    }))

    // Guardar actividades como ExerciseLogs
    // (solo las de hoy para no duplicar)
    const todayStr = new Date().toISOString().slice(0, 10)
    const startOfDay = new Date(todayStr + 'T00:00:00')
    const endOfDay = new Date(todayStr + 'T23:59:59')

    // Borrar logs de Strava de hoy
    await db.exerciseLog.deleteMany({
      where: { source: 'strava', loggedAt: { gte: startOfDay, lte: endOfDay } },
    })

    let savedCount = 0
    for (const ex of exercises) {
      const exDate = new Date(ex.startDate)
      if (exDate >= startOfDay && exDate <= endOfDay) {
        await db.exerciseLog.create({
          data: {
            actualName: ex.name,
            durationMin: ex.duration,
            caloriesBurn: ex.calories,
            intensity: ex.duration > 45 ? 'high' : ex.duration > 20 ? 'medium' : 'low',
            notes: `Strava: ${ex.type}${ex.distance ? ` · ${(ex.distance / 1000).toFixed(2)}km` : ''}`,
            source: 'strava',
            syncStatus: 'pending',
          },
        })
        savedCount++
      }
    }

    // Actualizar HealthData de hoy con datos de Strava
    if (savedCount > 0) {
      const totalCalories = exercises
        .filter((e: any) => new Date(e.startDate) >= startOfDay && new Date(e.startDate) <= endOfDay)
        .reduce((sum: number, e: any) => sum + (e.calories || 0), 0)
      const totalDuration = exercises
        .filter((e: any) => new Date(e.startDate) >= startOfDay && new Date(e.startDate) <= endOfDay)
        .reduce((sum: number, e: any) => sum + e.duration, 0)

      const dateObj = new Date(todayStr + 'T00:00:00')
      await db.healthData.upsert({
        where: { date: dateObj },
        update: {
          caloriesBurned: totalCalories,
          activeMinutes: totalDuration,
          exercises: JSON.stringify(exercises.filter((e: any) => new Date(e.startDate) >= startOfDay)),
          source: 'strava',
          syncedAt: new Date(),
        },
        create: {
          date: dateObj,
          caloriesBurned: totalCalories,
          activeMinutes: totalDuration,
          exercises: JSON.stringify(exercises.filter((e: any) => new Date(e.startDate) >= startOfDay)),
          source: 'strava',
        },
      })
    }

    return NextResponse.json({
      ok: true,
      totalActivities: exercises.length,
      savedToday: savedCount,
      activities: exercises.slice(0, 10).map((e: any) => ({
        name: e.name,
        type: e.type,
        duration: e.duration,
        calories: e.calories,
        distance: e.distance ? `${(e.distance / 1000).toFixed(2)}km` : null,
        date: e.startDate,
      })),
      message: `Sincronizado: ${exercises.length} actividades de Strava (${savedCount} hoy)`,
    })
  } catch (e: any) {
    console.error('Strava sync error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
