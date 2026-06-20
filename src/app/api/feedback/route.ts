import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { generateDailyFeedback, type AIProfileSnapshot, type ScheduleBlock } from '@/lib/ai'

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const feedback = await db.feedback.findFirst({
      where: { date: new Date(date + 'T00:00:00') },
    })
    return NextResponse.json({
      feedback: feedback ? { ...feedback, content: JSON.parse(feedback.content) } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const date = body.date || new Date().toISOString().slice(0, 10)

    const profile = await db.userProfile.findFirst({
      where: { userId },
      include: { schedules: true },
    })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const start = new Date(date + 'T00:00:00')
    const end = new Date(date + 'T23:59:59')
    const mealLogs = await db.mealLog.findMany({ where: { loggedAt: { gte: start, lte: end } } })
    const exerciseLogs = await db.exerciseLog.findMany({ where: { loggedAt: { gte: start, lte: end } } })

    const mealPlan = await db.mealPlan.findFirst({ orderBy: { createdAt: 'desc' } })
    const exercisePlan = await db.exercisePlan.findFirst({ orderBy: { createdAt: 'desc' } })

    let plannedMeals: any[] = []
    let plannedExercise: any[] = []
    if (mealPlan) {
      const parsed = JSON.parse(mealPlan.content)
      const dayName = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
      plannedMeals = (parsed.days || []).filter((d: any) => d.day?.toLowerCase() === dayName)
    }
    if (exercisePlan) {
      const parsed = JSON.parse(exercisePlan.content)
      const dayName = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
      plannedExercise = (parsed.days || []).filter((d: any) => d.day?.toLowerCase() === dayName)
    }

    const yesterday = new Date(date + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const previous = await db.feedback.findFirst({ where: { date: yesterday } })

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

    const feedback = await generateDailyFeedback({
      profile: snapshot,
      date,
      plannedMeals,
      actualMeals: mealLogs,
      plannedExercise,
      actualExercise: exerciseLogs,
      previousFeedback: previous?.content,
    })

    await db.feedback.deleteMany({ where: { date: new Date(date + 'T00:00:00') } })
    const saved = await db.feedback.create({
      data: {
        date: new Date(date + 'T00:00:00'),
        content: JSON.stringify(feedback),
        score: feedback.adherenceScore,
      },
    })

    return NextResponse.json({ feedback, saved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
