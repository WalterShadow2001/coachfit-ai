import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { generateWeeklyMealPlan, generateWeeklyExercisePlan, type AIProfileSnapshot, type ScheduleBlock, type LocalPriceInfo } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    const profile = await db.userProfile.findFirst({
      where: { userId },
      include: { schedules: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Completa el onboarding primero' }, { status: 400 })
    }

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

    // Calcular calorías objetivo según meta de peso (si existe)
    let targetCalories: number | null = null
    if (profile.targetWeeks && profile.targetWeeks > 0) {
      const weightDiff = Math.abs(profile.targetWeightKg - profile.weightKg)
      const totalKcalNeeded = weightDiff * 7700
      const dailyKcalChange = totalKcalNeeded / (profile.targetWeeks * 7)
      // TMB (Mifflin-St Jeor)
      let tmb = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
      tmb = profile.gender === 'male' ? tmb + 5 : tmb - 161
      const activityFactors: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
      }
      const tdee = tmb * (activityFactors[profile.activityLevel] || 1.2)
      if (profile.goal === 'lose') targetCalories = Math.round(tdee - dailyKcalChange)
      else if (profile.goal === 'gain') targetCalories = Math.round(tdee + dailyKcalChange)
      else targetCalories = Math.round(tdee)
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
      schedules,
      wakeTime: profile.wakeTime,
      sleepTime: profile.sleepTime,
      restrictions: JSON.parse(profile.restrictions || '[]'),
      allergies: JSON.parse(profile.allergies || '[]'),
      dislikedFoods: JSON.parse(profile.dislikedFoods || '[]'),
      equipment: JSON.parse(profile.equipment || '[]'),
      goal: profile.goal,
      medicalConditions: JSON.parse(profile.medicalConditions || '[]'),
      medicalNotes: profile.medicalNotes,
      targetWeeks: profile.targetWeeks,
      targetCalories,
    }

    // Obtener precios locales si el usuario tiene ubicación detectada
    let localPrices: LocalPriceInfo[] = []
    if (profile.city) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dbPrices = await db.localPrice.findMany({
        where: {
          city: profile.city,
          lastChecked: { gte: thirtyDaysAgo },
        },
        take: 30,
      })
      localPrices = dbPrices.map(p => ({
        productName: p.productName,
        category: p.category,
        price: p.price,
        store: p.store,
        unit: p.unit,
      }))
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
        const mp = await generateWeeklyMealPlan(snapshot, localPrices)
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
        // No retornar error, continuar con exercise plan
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
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    // Devolver el plan más reciente sin filtrar por generatedFor
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
