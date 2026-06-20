import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adaptExercisePlan, type AIProfileSnapshot, type ScheduleBlock } from '@/lib/ai'

/**
 * POST /api/ai-adapt
 * Regenera SOLO el plan de ejercicio basado en el cumplimiento del usuario.
 * NO toca la dieta (respeta presupuesto y preferencias).
 */
export async function POST() {
  try {
    const profile = await db.userProfile.findFirst({
      include: { schedules: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })
    }

    // Plan actual de ejercicio
    const exercisePlan = await db.exercisePlan.findFirst({ orderBy: { createdAt: 'desc' } })
    if (!exercisePlan) {
      return NextResponse.json({ error: 'No hay plan de ejercicio para adaptar. Genera uno primero.' }, { status: 400 })
    }
    const currentPlan = JSON.parse(exercisePlan.content)

    // Recopilar datos de adherencia de los últimos 7 días
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const now = new Date()

    const exerciseLogs = await db.exerciseLog.findMany({
      where: { loggedAt: { gte: weekAgo, lte: now } },
      orderBy: { loggedAt: 'asc' },
    })

    // Feedbacks de la semana
    const feedbacks = await db.feedback.findMany({
      where: { date: { gte: weekAgo, lte: now } },
      orderBy: { date: 'asc' },
    })

    // Calcular días perdidos
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const allDays: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      allDays.push(dayNames[d.getDay()])
    }

    // Días en los que el plan tenía ejercicio
    const plannedDays = (currentPlan.days || []).map((d: any) => d.day?.toLowerCase()).filter(Boolean)

    // Días en los que sí registró ejercicio
    const daysWithExercise = new Set(
      exerciseLogs.map(l => dayNames[l.loggedAt.getDay()])
    )

    const daysMissed = plannedDays.filter((d: string) => !daysWithExercise.has(d))

    // Adherencia promedio
    const avgAdherence = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((s, f) => s + (f.score || 0), 0) / feedbacks.length)
      : 0

    // Calorías objetivo (suma de caloriesBurn de los días planeados)
    const caloriesTarget = (currentPlan.days || []).reduce((sum: number, d: any) => sum + (d.caloriesBurn || 0), 0)

    // Calorías reales
    const caloriesActual = exerciseLogs.reduce((sum, l) => sum + (l.caloriesBurn || 0), 0)

    // Último feedback
    const lastFeedback = feedbacks[feedbacks.length - 1]?.content

    const schedules: ScheduleBlock[] = profile.schedules.map(s => ({
      label: s.label,
      days: JSON.parse(s.days || '[]'),
      workStart: s.workStart,
      workEnd: s.workEnd,
      lunchStart: s.lunchStart,
      lunchEnd: s.lunchEnd,
      isFreeDay: s.isFreeDay,
      notes: s.notes,
    }))

    const snapshot: AIProfileSnapshot = {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      activityLevel: profile.activityLevel,
      budgetPerWeek: profile.budgetPerWeek,
      schedules,
      wakeTime: profile.wakeTime,
      sleepTime: profile.sleepTime,
      restrictions: JSON.parse(profile.restrictions || '[]'),
      allergies: JSON.parse(profile.allergies || '[]'),
      dislikedFoods: JSON.parse(profile.dislikedFoods || '[]'),
      equipment: JSON.parse(profile.equipment || '[]'),
      goal: profile.goal,
    }

    const result = await adaptExercisePlan({
      profile: snapshot,
      currentPlan,
      adherenceData: {
        daysMissed,
        avgAdherence,
        lastFeedback,
        exerciseLogsLast7Days: exerciseLogs,
        caloriesTarget,
        caloriesActual,
      },
    })

    // Guardar nuevo plan (mantener el de comidas sin tocar)
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    const day = weekStart.getDay()
    const diff = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diff)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    await db.exercisePlan.deleteMany({ where: { weekStart: { gte: weekStart } } })
    const saved = await db.exercisePlan.create({
      data: {
        weekStart,
        weekEnd,
        content: JSON.stringify(result.newPlan),
      },
    })

    return NextResponse.json({
      ok: true,
      reason: result.reason,
      changes: result.changes,
      newPlan: { ...saved, parsed: result.newPlan },
      stats: {
        daysMissed,
        avgAdherence,
        caloriesTarget,
        caloriesActual,
        deficit: caloriesTarget - caloriesActual,
      },
    })
  } catch (e: any) {
    console.error('AI adapt error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
