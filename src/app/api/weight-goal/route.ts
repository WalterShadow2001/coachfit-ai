import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/weight-goal
 * Devuelve la meta de peso actual + análisis de viabilidad
 */
export async function GET() {
  try {
    const profile = await db.userProfile.findFirst()
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

/**
 * POST /api/weight-goal
 * Guarda la meta de tiempo y devuelve análisis de viabilidad
 * body: { targetWeeks?: number, targetDate?: string }
 * Si no se pasa targetWeeks, se calcula uno seguro automáticamente
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profile = await db.userProfile.findFirst()
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
      data: {
        targetWeeks,
        targetDate,
      },
    })

    const updated = await db.userProfile.findFirst()
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

/**
 * Analiza la viabilidad de la meta de peso
 * Basado en:
 * - Máximo seguro: 0.5-1 kg por semana (1% del peso corporal)
 * - Déficit calórico máximo: 1000 kcal/día (no superar)
 * - 1 kg grasa = ~7700 kcal
 * - TMB (Mifflin-St Jeor) + factor actividad
 */
function analyzeWeightGoal(profile: any) {
  const weightKg = profile.weightKg
  const targetWeightKg = profile.targetWeightKg
  const heightCm = profile.heightCm
  const age = profile.age
  const gender = profile.gender
  const activityLevel = profile.activityLevel
  const goal = profile.goal
  const targetWeeks = profile.targetWeeks

  const weightDiff = targetWeightKg - weightKg // negativo = perder, positivo = ganar
  const absDiff = Math.abs(weightDiff)

  // TMB (Tasa Metabólica Basal) - Mifflin-St Jeor
  let tmb = 10 * weightKg + 6.25 * heightCm - 5 * age
  tmb = gender === 'male' ? tmb + 5 : tmb - 161

  // Factor de actividad
  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  }
  const tdee = tmb * (activityFactors[activityLevel] || 1.2) // gasto calórico diario total

  // Tiempo mínimo seguro (máx 1% peso/semana o 1 kg/semana, lo que sea menor)
  const maxWeeklyLoss = Math.min(weightKg * 0.01, 1.0) // kg/semana
  const minWeeksSafe = Math.ceil(absDiff / maxWeeklyLoss)

  // Si no hay targetWeeks, sugerir el mínimo seguro
  const effectiveWeeks = targetWeeks || minWeeksSafe

  // Calcular déficit/superávit calórico necesario
  const totalKcalNeeded = absDiff * 7700 // 1 kg grasa = 7700 kcal
  const dailyKcalChange = effectiveWeeks > 0 ? totalKcalNeeded / (effectiveWeeks * 7) : 0

  // Calorías objetivo
  let targetCalories = tdee
  if (goal === 'lose') targetCalories = tdee - dailyKcalChange
  else if (goal === 'gain') targetCalories = tdee + dailyKcalChange

  // Análisis de seguridad
  const isSafe = effectiveWeeks >= minWeeksSafe
  const weeklyRate = effectiveWeeks > 0 ? absDiff / effectiveWeeks : 0
  const isAggressive = weeklyRate > maxWeeklyLoss * 1.5
  const isDangerous = weeklyRate > maxWeeklyLoss * 2.5

  // Advertencias
  const warnings: string[] = []
  const recommendations: string[] = []

  if (goal === 'lose') {
    if (isDangerous) {
      warnings.push(`🚨 PELIGRO: Perder ${weeklyRate.toFixed(2)} kg/semana es muy peligroso para tu salud.`)
      warnings.push(`🚨 Máximo seguro: ${maxWeeklyLoss.toFixed(2)} kg/semana (${minWeeksSafe} semanas mínimo).`)
      warnings.push('🚨 Riesgos: pérdida muscular, deficiencias nutricionales, cálculos biliares, deshidratación.')
      recommendations.push(`Te recomiendo tomar al menos ${minWeeksSafe} semanas para llegar a tu meta de forma segura.`)
    } else if (isAggressive) {
      warnings.push(`⚠️ Agresivo: ${weeklyRate.toFixed(2)} kg/semana es posible pero requiere disciplina estricta.`)
      warnings.push('⚠️ Puede afectar tu energía en el trabajo y sueño.')
      recommendations.push('Considera extender el tiempo a ' + minWeeksSafe + ' semanas para que sea más sostenible.')
    } else if (!isSafe) {
      warnings.push(`⚠️ Meta poco realista. Necesitas al menos ${minWeeksSafe} semanas.`)
    }
    if (dailyKcalChange > 1000) {
      warnings.push(`⚠️ Déficit de ${Math.round(dailyKcalChange)} kcal/día es muy alto (máx recomendado: 1000).`)
      recommendations.push('NUNCA bajes de 1200 kcal/día (mujeres) o 1500 kcal/día (hombres) sin supervisión médica.')
    }
    if (targetCalories < 1200 && gender === 'female') {
      warnings.push(`⚠️ ${Math.round(targetCalories)} kcal/día es muy bajo para una mujer (mínimo 1200).`)
    }
    if (targetCalories < 1500 && gender === 'male') {
      warnings.push(`⚠️ ${Math.round(targetCalories)} kcal/día es muy bajo para un hombre (mínimo 1500).`)
    }
  } else if (goal === 'gain') {
    if (weeklyRate > 0.5) {
      warnings.push(`⚠️ Ganar ${weeklyRate.toFixed(2)} kg/semana probablemente será grasa, no músculo.`)
      recommendations.push('Para ganar masa muscular: máximo 0.25-0.5 kg/semana con entrenamiento de fuerza.')
    }
    if (dailyKcalChange > 500) {
      warnings.push(`⚠️ Superávit de ${Math.round(dailyKcalChange)} kcal/día es alto. La mayoría será grasa.`)
    }
  }

  // Ejercicio recomendado según intensidad
  let exerciseRecommendation = ''
  if (goal === 'lose') {
    if (isDangerous) {
      exerciseRecommendation = `Necesitas ${Math.round(dailyKcalChange)} kcal/día de déficit. Esto requiere ejercicio intenso 6-7 días/semana (1h cardio + 30min fuerza). PELIGROSO sin supervisión.`
    } else if (isAggressive) {
      exerciseRecommendation = `Déficit de ${Math.round(dailyKcalChange)} kcal/día. Cardio 5-6 días/semana (45min) + fuerza 3 días. Aceptable si duermes bien y no te mareas.`
    } else {
      exerciseRecommendation = `Déficit de ${Math.round(dailyKcalChange)} kcal/día. Cardio 3-4 días/semana (30min) + fuerza 2-3 días. Sostenible y saludable.`
    }
  } else if (goal === 'gain') {
    exerciseRecommendation = `Superávit de ${Math.round(dailyKcalChange)} kcal/día. Fuerza 4-5 días/semana (1h), cardio opcional 2 días. Come proteína cada 3h.`
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
