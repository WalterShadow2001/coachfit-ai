import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const analysis = analyzeWeightGoal(profile)
    return NextResponse.json({
      current: {
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        targetWeeks: profile.targetWeeks,
        targetDate: profile.targetDate,
        goal: profile.goal,
      },
      analysis,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    let targetWeeks: number | null = null
    let targetDate: Date | null = null

    if (body.targetWeeks) {
      targetWeeks = Number(body.targetWeeks)
      targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + (targetWeeks * 7))
    } else if (body.targetDate) {
      targetDate = new Date(body.targetDate)
      const now = new Date()
      const diffMs = targetDate.getTime() - now.getTime()
      targetWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))
    }

    await db.userProfile.update({
      where: { id: profile.id },
      data: { targetWeeks, targetDate },
    })

    const updated = await db.userProfile.findFirst({ where: { userId } })
    const analysis = analyzeWeightGoal(updated!)

    return NextResponse.json({
      ok: true,
      current: {
        weightKg: updated!.weightKg,
        targetWeightKg: updated!.targetWeightKg,
        targetWeeks,
        targetDate,
        goal: updated!.goal,
      },
      analysis,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function analyzeWeightGoal(profile: any) {
  const weightKg = profile.weightKg
  const targetWeightKg = profile.targetWeightKg
  const heightCm = profile.heightCm
  const age = profile.age
  const gender = profile.gender
  const activityLevel = profile.activityLevel
  const goal = profile.goal
  const targetWeeks = profile.targetWeeks

  const weightDiff = targetWeightKg - weightKg
  const absDiff = Math.abs(weightDiff)

  let tmb = 10 * weightKg + 6.25 * heightCm - 5 * age
  tmb = gender === 'male' ? tmb + 5 : tmb - 161

  const activityFactors: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
  }
  const tdee = tmb * (activityFactors[activityLevel] || 1.2)

  const maxWeeklyLoss = Math.min(weightKg * 0.01, 1.0)
  const minWeeksSafe = Math.ceil(absDiff / maxWeeklyLoss)
  const effectiveWeeks = targetWeeks || minWeeksSafe

  const totalKcalNeeded = absDiff * 7700
  const dailyKcalChange = effectiveWeeks > 0 ? totalKcalNeeded / (effectiveWeeks * 7) : 0

  let targetCalories = tdee
  if (goal === 'lose') targetCalories = tdee - dailyKcalChange
  else if (goal === 'gain') targetCalories = tdee + dailyKcalChange

  const isSafe = effectiveWeeks >= minWeeksSafe
  const weeklyRate = effectiveWeeks > 0 ? absDiff / effectiveWeeks : 0
  const isAggressive = weeklyRate > maxWeeklyLoss * 1.5
  const isDangerous = weeklyRate > maxWeeklyLoss * 2.5

  const warnings: string[] = []
  const recommendations: string[] = []

  if (goal === 'lose') {
    if (isDangerous) {
      warnings.push(`PELIGRO: Perder ${weeklyRate.toFixed(2)} kg/semana es muy peligroso para tu salud.`)
      warnings.push(`Maximo seguro: ${maxWeeklyLoss.toFixed(2)} kg/semana (${minWeeksSafe} semanas minimo).`)
      warnings.push('Riesgos: perdida muscular, deficiencias nutricionales, calculos biliares, deshidratacion.')
      recommendations.push(`Te recomiendo tomar al menos ${minWeeksSafe} semanas para llegar a tu meta de forma segura.`)
    } else if (isAggressive) {
      warnings.push(`Agresivo: ${weeklyRate.toFixed(2)} kg/semana es posible pero requiere disciplina estricta.`)
      warnings.push('Puede afectar tu energia en el trabajo y sueno.')
      recommendations.push('Considera extender el tiempo a ' + minWeeksSafe + ' semanas para que sea mas sostenible.')
    } else if (!isSafe) {
      warnings.push(`Meta poco realista. Necesitas al menos ${minWeeksSafe} semanas.`)
    }
    if (dailyKcalChange > 1000) {
      warnings.push(`Deficit de ${Math.round(dailyKcalChange)} kcal/dia es muy alto (max recomendado: 1000).`)
      recommendations.push('NUNCA bajes de 1200 kcal/dia (mujeres) o 1500 kcal/dia (hombres) sin supervision medica.')
    }
    if (targetCalories < 1200 && gender === 'female') {
      warnings.push(`${Math.round(targetCalories)} kcal/dia es muy bajo para una mujer (minimo 1200).`)
    }
    if (targetCalories < 1500 && gender === 'male') {
      warnings.push(`${Math.round(targetCalories)} kcal/dia es muy bajo para un hombre (minimo 1500).`)
    }
  } else if (goal === 'gain') {
    if (weeklyRate > 0.5) {
      warnings.push(`Ganar ${weeklyRate.toFixed(2)} kg/semana probablemente sera grasa, no musculo.`)
      recommendations.push('Para ganar masa muscular: maximo 0.25-0.5 kg/semana con entrenamiento de fuerza.')
    }
    if (dailyKcalChange > 500) {
      warnings.push(`Superavit de ${Math.round(dailyKcalChange)} kcal/dia es alto. La mayoria sera grasa.`)
    }
  }

  let exerciseRecommendation = ''
  if (goal === 'lose') {
    if (isDangerous) {
      exerciseRecommendation = `Necesitas ${Math.round(dailyKcalChange)} kcal/dia de deficit. Esto requiere ejercicio intenso 6-7 dias/semana (1h cardio + 30min fuerza). PELIGROSO sin supervision.`
    } else if (isAggressive) {
      exerciseRecommendation = `Deficit de ${Math.round(dailyKcalChange)} kcal/dia. Cardio 5-6 dias/semana (45min) + fuerza 3 dias. Aceptable si duermes bien y no te mareas.`
    } else {
      exerciseRecommendation = `Deficit de ${Math.round(dailyKcalChange)} kcal/dia. Cardio 3-4 dias/semana (30min) + fuerza 2-3 dias. Sostenible y saludable.`
    }
  } else if (goal === 'gain') {
    exerciseRecommendation = `Superavit de ${Math.round(dailyKcalChange)} kcal/dia. Fuerza 4-5 dias/semana (1h), cardio opcional 2 dias. Come proteina cada 3h.`
  }

  return {
    weightDiff: Math.round(weightDiff * 100) / 100,
    absDiff: Math.round(absDiff * 100) / 100,
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    dailyKcalChange: Math.round(dailyKcalChange),
    weeklyRate: Math.round(weeklyRate * 100) / 100,
    maxWeeklyLoss: Math.round(maxWeeklyLoss * 100) / 100,
    minWeeksSafe,
    effectiveWeeks,
    isSafe,
    isAggressive,
    isDangerous,
    warnings,
    recommendations,
    exerciseRecommendation,
    targetDate: profile.targetDate,
  }
}
