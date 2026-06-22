import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * POST /api/google-fit/sync
 * Lee datos REALES de Google Fit.
 *
 * Flujo:
 * 1. Si recibe accessToken en el body, usarlo directamente
 * 2. Si no, buscar tokens guardados en la DB del usuario
 * 3. Si el token expiró, usar refresh_token para obtener uno nuevo
 * 4. Llamar a Google Fit REST API con el token
 * 5. Si Google responde error, NO decir "ok", devolver error real
 * 6. Solo marcar "connected" si de verdad sincronizó
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    // 1. Obtener access token
    let accessToken = body.accessToken as string | undefined

    // 2. Si no viene en el body, buscar en DB
    if (!accessToken && profile.googleFitAccessToken) {
      const now = Math.floor(Date.now() / 1000)
      const expiry = profile.googleFitTokenExpiry || 0

      // 3. Si el token expira en menos de 5 min, renovar
      if (now > expiry - 300 && profile.googleFitRefreshToken) {
        const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET

        if (clientId && clientSecret) {
          try {
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: profile.googleFitRefreshToken,
                grant_type: 'refresh_token',
              }),
            })

            if (refreshResponse.ok) {
              const newTokens = await refreshResponse.json()
              accessToken = newTokens.access_token
              const newExpiry = Math.floor(Date.now() / 1000) + (newTokens.expires_in || 3600)

              // Guardar nuevo token en DB
              await db.userProfile.update({
                where: { id: profile.id },
                data: {
                  googleFitAccessToken: accessToken,
                  googleFitTokenExpiry: newExpiry,
                },
              })
            } else {
              // Refresh token inválido - borrar conexión
              await db.userProfile.update({
                where: { id: profile.id },
                data: {
                  googleFitConnected: false,
                  googleFitAccessToken: null,
                  googleFitRefreshToken: null,
                  googleFitTokenExpiry: null,
                },
              })
              return NextResponse.json({
                error: 'Tu sesión de Google Fit expiró. Vuelve a conectar tu cuenta.',
                needsReconnect: true,
              }, { status: 401 })
            }
          } catch (refreshError: any) {
            return NextResponse.json({
              error: 'Error al renovar token: ' + refreshError.message,
            }, { status: 500 })
          }
        }
      } else {
        // Token aún válido
        accessToken = profile.googleFitAccessToken
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        error: 'No hay token de Google Fit. Conecta tu cuenta primero.',
        needsReconnect: true,
      }, { status: 401 })
    }

    // 4. Fechas: hoy
    const now = new Date()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const startTimeNs = `${startOfDay.getTime() * 1000000}`
    const endTimeNs = `${now.getTime() * 1000000}`

    // 5. Leer datos de Google Fit REST API
    const [stepsRes, caloriesRes, distanceRes, activityRes, heartRateRes] = await Promise.all([
      fetchGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'),
      fetchGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended'),
      fetchGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta'),
      fetchGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes'),
      fetchGoogleFitData(accessToken, startTimeNs, endTimeNs, 'derived:com.google.heart_rate.summary:com.google.android.gms:merge_heart_rate_summary'),
    ])

    // Verificar si Google respondió con error
    if (stepsRes.error) {
      return NextResponse.json({
        error: 'Google Fit rechazó el token: ' + stepsRes.error,
        needsReconnect: true,
      }, { status: 403 })
    }

    const steps = extractSum(stepsRes)
    const caloriesBurned = Math.round(extractSum(caloriesRes))
    const distanceMeters = Math.round(extractSum(distanceRes))
    const activeMinutes = Math.round(extractSum(activityRes))
    const heartRateAvg = extractAvg(heartRateRes)

    // 6. Leer sesiones de ejercicio
    let exercises: any[] = []
    try {
      const sessionsResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startOfDay.toISOString()}&endTime=${now.toISOString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        exercises = (sessionsData.session || []).map((s: any) => {
          const durationMs = new Date(s.endTimeMillis).getTime() - new Date(s.startTimeMillis).getTime()
          const durationMin = Math.round(durationMs / 60000)
          const activityTypes: Record<string, string> = {
            '1': 'Caminar', '3': 'Ciclismo', '8': 'Correr', '35': 'Pesas',
            '72': 'Yoga', '79': 'Cardio', '91': 'HIIT',
          }
          return {
            name: s.name || activityTypes[s.activityType] || 'Ejercicio',
            type: activityTypes[s.activityType] || 'Otro',
            duration: durationMin,
            calories: null,
            startTime: new Date(Number(s.startTimeMillis)).toISOString(),
            endTime: new Date(Number(s.endTimeMillis)).toISOString(),
          }
        })
      }
    } catch {}

    // 7. Guardar en HealthData
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
        syncStatus: 'synced',
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

    // 8. Si hay ejercicios, crear ExerciseLogs
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
            intensity: ex.duration > 30 ? 'high' : ex.duration > 15 ? 'medium' : 'low',
            notes: `Detectado por Google Fit (${ex.type})`,
            source: 'google_fit',
            syncStatus: 'synced',
          },
        })
      }
    }

    // 9. Marcar como conectado (solo si llegamos hasta aquí)
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

async function fetchGoogleFitData(accessToken: string, startTimeNs: string, endTimeNs: string, dataSourceId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataSources/${dataSourceId}/datasets/${startTimeNs}-${endTimeNs}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!response.ok) {
      const errorBody = await response.text()
      return { point: [], error: `HTTP ${response.status}: ${errorBody.slice(0, 200)}` }
    }
    return await response.json()
  } catch (e: any) {
    return { point: [], error: e.message }
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

export async function DELETE() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        googleFitConnected: false,
        googleFitAccessToken: null,
        googleFitRefreshToken: null,
        googleFitTokenExpiry: null,
        googleFitLastSync: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
