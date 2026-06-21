import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * POST /api/google-fit/sync
 * Lee datos reales de Google Fit usando el access token
 * body: { accessToken, refreshToken? }
 *
 * Lee:
 * - Pasos del día
 * - Calorías quemadas
 * - Distancia
 * - Minutos de actividad
 * - Sesiones de ejercicio
 *
 * NOTA IMPORTANTE SOBRE SAMSUNG HEALTH:
 * Samsung Health puede enviar datos a Google Fit. Para activarlo:
 * 1. Abre Samsung Health en tu celular
 * 2. Ve a Ajustes → Samsung Health → Conectar con Google Fit
 * 3. Activa la sincronización
 * 4. Los datos de Samsung Health aparecerán automáticamente en Google Fit
 * 5. Nuestra app lee de Google Fit y obtiene los datos de Samsung Health
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const { accessToken } = body as { accessToken: string }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token requerido. Conecta tu cuenta de Google primero.' }, { status: 400 })
    }

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    // Fechas: hoy
    const now = new Date()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const startTimeNs = `${startOfDay.getTime() * 1000000}`
    const endTimeNs = `${now.getTime() * 1000000}`

    // Leer datos de Google Fit REST API
    const [stepsData, caloriesData, distanceData, activityData, heartRateData] = await Promise.all([
      readGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'),
      readGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended'),
      readGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta'),
      readGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes'),
      readGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.heart_rate.summary:com.google.android.gms:merge_heart_rate_summary'),
    ])

    // Procesar datos
    const steps = extractSum(stepsData)
    const caloriesBurned = Math.round(extractSum(caloriesData))
    const distanceMeters = Math.round(extractSum(distanceData))
    const activeMinutes = Math.round(extractSum(activityData))
    const heartRateAvg = extractAvg(heartRateData)

    // Leer sesiones de ejercicio
    const sessionsResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startOfDay.toISOString()}&endTime=${now.toISOString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    let exercises: any[] = []
    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json()
      exercises = (sessionsData.session || []).map((s: any) => {
        const durationMs = new Date(s.endTimeMillis).getTime() - new Date(s.startTimeMillis).getTime()
        const durationMin = Math.round(durationMs / 60000)
        const activityTypes: Record<string, string> = {
          '1': 'Caminar', '3': 'Ciclismo', '8': 'Correr', '35': 'Pesas',
          '72': 'Yoga', '79': 'Cardio', '91': 'HIIT', '104': 'Natación',
          '119': 'Senderismo', '96': 'Circuito', '87': 'Crossfit',
        }
        return {
          name: s.name || activityTypes[s.activityType] || 'Ejercicio',
          type: activityTypes[s.activityType] || 'Otro',
          duration: durationMin,
          calories: s.caloriesConsumed || s.activeCalories || null,
          startTime: new Date(Number(s.startTimeMillis)).toISOString(),
          endTime: new Date(Number(s.endTimeMillis)).toISOString(),
        }
      })
    }

    // Guardar en HealthData
    const todayStr = now.toISOString().slice(0, 10)
    const dateObj = new Date(todayStr + 'T00:00:00')

    await db.healthData.upsert({
      where: { date: dateObj },
      update: {
        steps,
        caloriesBurned,
        distanceMeters,
        activeMinutes,
        heartRateAvg,
        exercises: JSON.stringify(exercises),
        source: 'google_fit',
        syncStatus: 'pending',
        syncedAt: new Date(),
      },
      create: {
        date: dateObj,
        steps,
        caloriesBurned,
        distanceMeters,
        activeMinutes,
        heartRateAvg,
        exercises: JSON.stringify(exercises),
        source: 'google_fit',
      },
    })

    // Si hay ejercicios, crear ExerciseLogs
    if (exercises.length > 0) {
      const startOfDayDate = new Date(todayStr + 'T00:00:00')
      const endOfDayDate = new Date(todayStr + 'T23:59:59')
      await db.exerciseLog.deleteMany({
        where: { source: 'google_fit', loggedAt: { gte: startOfDayDate, lte: endOfDayDate } },
      })
      for (const ex of exercises) {
        await db.exerciseLog.create({
          data: {
            actualName: ex.name,
            durationMin: ex.duration,
            caloriesBurn: ex.calories,
            intensity: ex.duration > 30 ? 'high' : ex.duration > 15 ? 'medium' : 'low',
            notes: `Detectado por Google Fit${ex.type !== 'Otro' ? ` (${ex.type})` : ''}`,
            source: 'google_fit',
            syncStatus: 'pending',
          },
        })
      }
    }

    // Actualizar perfil
    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        googleFitConnected: true,
        googleFitLastSync: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        steps,
        caloriesBurned,
        distanceMeters,
        activeMinutes,
        heartRateAvg,
        exercises,
        source: 'google_fit',
      },
      message: `Sincronizado: ${steps} pasos, ${caloriesBurned} kcal, ${exercises.length} ejercicios`,
    })
  } catch (e: any) {
    console.error('Google Fit sync error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function readGoogleFitData(accessToken: string, startTimeNs: string, endTimeNs: string, dataSourceId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataSources/${dataSourceId}/datasets/${startTimeNs}-${endTimeNs}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!response.ok) return { point: [] }
    return await response.json()
  } catch {
    return { point: [] }
  }
}

function extractSum(data: any): number {
  if (!data?.point || data.point.length === 0) return 0
  return data.point.reduce((sum: number, p: any) => {
    if (p.value && p.value[0]) {
      return sum + (p.value[0].intVal || p.value[0].fpVal || 0)
    }
    return sum
  }, 0)
}

function extractAvg(data: any): number | null {
  if (!data?.point || data.point.length === 0) return null
  const values = data.point.map((p: any) => p.value?.[0]?.fpVal || p.value?.[0]?.intVal || 0).filter((v: number) => v > 0)
  if (values.length === 0) return null
  return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
}
