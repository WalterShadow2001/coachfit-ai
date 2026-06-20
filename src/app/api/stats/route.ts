import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    const profile = await db.userProfile.findFirst({ where: { userId } })
    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })

    if (!profile) {
      return NextResponse.json({ profile: null, needsOnboarding: true })
    }

    // Estadísticas de los últimos 7 días
    const now = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const mealLogs = await db.mealLog.findMany({
      where: { loggedAt: { gte: weekAgo, lte: now } },
      orderBy: { loggedAt: 'asc' },
    })
    const exerciseLogs = await db.exerciseLog.findMany({
      where: { loggedAt: { gte: weekAgo, lte: now } },
      orderBy: { loggedAt: 'asc' },
    })

    const feedbacks = await db.feedback.findMany({
      where: { date: { gte: weekAgo, lte: now } },
      orderBy: { date: 'asc' },
    })

    // Agrupar por día
    const byDay: Record<string, { meals: number; exerciseMin: number; caloriesBurn: number; caloriesIn: number; score?: number }> = {}
    for (const m of mealLogs) {
      const d = m.loggedAt.toISOString().slice(0, 10)
      if (!byDay[d]) byDay[d] = { meals: 0, exerciseMin: 0, caloriesBurn: 0, caloriesIn: 0 }
      byDay[d].meals++
      byDay[d].caloriesIn += m.calories || 0
    }
    for (const e of exerciseLogs) {
      const d = e.loggedAt.toISOString().slice(0, 10)
      if (!byDay[d]) byDay[d] = { meals: 0, exerciseMin: 0, caloriesBurn: 0, caloriesIn: 0 }
      byDay[d].exerciseMin += e.durationMin
      byDay[d].caloriesBurn += e.caloriesBurn || 0
    }
    for (const f of feedbacks) {
      const d = f.date.toISOString().slice(0, 10)
      if (!byDay[d]) byDay[d] = { meals: 0, exerciseMin: 0, caloriesBurn: 0, caloriesIn: 0 }
      byDay[d].score = f.score ?? undefined
    }

    // Notificaciones pendientes count
    const pendingNotifications = await db.notification.count({
      where: { status: 'pending' },
    })

    return NextResponse.json({
      profile,
      settings,
      byDay,
      totalMeals: mealLogs.length,
      totalExerciseMin: exerciseLogs.reduce((sum, e) => sum + e.durationMin, 0),
      totalCaloriesBurned: exerciseLogs.reduce((sum, e) => sum + (e.caloriesBurn || 0), 0),
      avgScore: feedbacks.length > 0 ? Math.round(feedbacks.reduce((s, f) => s + (f.score || 0), 0) / feedbacks.length) : null,
      pendingNotifications,
      recentFeedbacks: feedbacks.slice(-5).map(f => ({ ...f, content: JSON.parse(f.content) })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
