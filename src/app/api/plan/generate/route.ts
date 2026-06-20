import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateWeeklyMealPlan, generateWeeklyExercisePlan, type AIProfileSnapshot } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const profile = await db.userProfile.findFirst()
    if (!profile) {
      return NextResponse.json({ error: 'Completa el onboarding primero' }, { status: 400 })
    }

    const snapshot: AIProfileSnapshot = {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      activityLevel: profile.activityLevel,
      budgetPerWeek: profile.budgetPerWeek,
      workStart: profile.workStart,
      workEnd: profile.workEnd,
      workDays: JSON.parse(profile.workDays || '[]'),
      lunchStart: profile.lunchStart,
      lunchEnd: profile.lunchEnd,
      wakeTime: profile.wakeTime,
      sleepTime: profile.sleepTime,
      restrictions: JSON.parse(profile.restrictions || '[]'),
      allergies: JSON.parse(profile.allergies || '[]'),
      dislikedFoods: JSON.parse(profile.dislikedFoods || '[]'),
      equipment: JSON.parse(profile.equipment || '[]'),
      goal: profile.goal,
    }

    const body = await req.json().catch(() => ({}))
    const what = body.what || 'both' // 'meal' | 'exercise' | 'both'

    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    // Lunes como inicio de semana
    const day = weekStart.getDay()
    const diff = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diff)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    let mealPlan = null
    let exercisePlan = null

    if (what === 'meal' || what === 'both') {
      try {
        const mp = await generateWeeklyMealPlan(snapshot)
        await db.mealPlan.deleteMany({ where: { weekStart: { gte: weekStart } } })
        mealPlan = await db.mealPlan.create({
          data: {
            weekStart,
            weekEnd,
            content: JSON.stringify(mp),
            generatedFor: JSON.stringify(snapshot),
          },
        })
        mealPlan = { ...mealPlan, parsed: mp }
      } catch (e: any) {
        console.error('Meal plan error:', e)
        return NextResponse.json({ error: `Error generando plan de comidas: ${e.message}` }, { status: 500 })
      }
    }

    if (what === 'exercise' || what === 'both') {
      try {
        const ep = await generateWeeklyExercisePlan(snapshot)
        await db.exercisePlan.deleteMany({ where: { weekStart: { gte: weekStart } } })
        exercisePlan = await db.exercisePlan.create({
          data: {
            weekStart,
            weekEnd,
            content: JSON.stringify(ep),
          },
        })
        exercisePlan = { ...exercisePlan, parsed: ep }
      } catch (e: any) {
        console.error('Exercise plan error:', e)
        return NextResponse.json({ error: `Error generando rutina: ${e.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ mealPlan, exercisePlan })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const mealPlan = await db.mealPlan.findFirst({ orderBy: { createdAt: 'desc' } })
    const exercisePlan = await db.exercisePlan.findFirst({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({
      mealPlan: mealPlan ? { ...mealPlan, parsed: JSON.parse(mealPlan.content) } : null,
      exercisePlan: exercisePlan ? { ...exercisePlan, parsed: JSON.parse(exercisePlan.content) } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
