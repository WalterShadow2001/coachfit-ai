import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Programa las notificaciones del día según el perfil del usuario y su plan
export async function POST() {
  try {
    const profile = await db.userProfile.findFirst()
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const settings = await db.settings.findUnique({ where: { id: 'default' } })
    if (!settings?.notificationsEnabled) {
      return NextResponse.json({ scheduled: 0, message: 'Notificaciones deshabilitadas' })
    }

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const dayName = today.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
    const workDays: string[] = JSON.parse(profile.workDays || '[]')
    const isWorkDay = workDays.some(d => dayName.startsWith(d.toLowerCase().slice(0, 3)))

    // Limpiar notificaciones pendientes de hoy que aún no se han disparado
    const startToday = new Date(todayStr + 'T00:00:00')
    const endToday = new Date(todayStr + 'T23:59:59')
    await db.notification.deleteMany({
      where: {
        scheduledFor: { gte: startToday, lte: endToday },
        status: 'pending',
        retryCount: 0,
      },
    })

    const toSchedule: Array<{ type: string; title: string; body: string; scheduledFor: Date; payload?: any }> = []

    // Plan de comidas del día
    const mealPlan = await db.mealPlan.findFirst({ orderBy: { createdAt: 'desc' } })
    let todaysMeals: any = null
    if (mealPlan) {
      const parsed = JSON.parse(mealPlan.content)
      todaysMeals = (parsed.days || []).find((d: any) => d.day?.toLowerCase() === dayName)
    }

    // Plan de ejercicio del día
    const exercisePlan = await db.exercisePlan.findFirst({ orderBy: { createdAt: 'desc' } })
    let todaysExercise: any = null
    if (exercisePlan) {
      const parsed = JSON.parse(exercisePlan.content)
      todaysExercise = (parsed.days || []).find((d: any) => d.day?.toLowerCase() === dayName)
    }

    // === Desayuno ===
    const breakfastTime = parseTime(todayStr, subtractMinutes(profile.wakeTime, 0))
    // 15 min después de despertar
    breakfastTime.setMinutes(breakfastTime.getMinutes() + 15)
    if (breakfastTime > today) {
      toSchedule.push({
        type: 'meal',
        title: 'Hora del desayuno',
        body: todaysMeals?.breakfast?.name
          ? `Plan: ${todaysMeals.breakfast.name}`
          : '¿Qué vas a desayunar? Registra tu comida.',
        scheduledFor: breakfastTime,
        payload: { mealType: 'breakfast', planned: todaysMeals?.breakfast },
      })
    }

    // === Lunch ===
    const lunchTime = parseTime(todayStr, profile.lunchStart)
    if (lunchTime > today) {
      toSchedule.push({
        type: 'meal',
        title: 'Hora de comer',
        body: todaysMeals?.lunch?.name
          ? `Plan: ${todaysMeals.lunch.name}`
          : 'Es tu hora de comida. ¿Qué vas a comer?',
        scheduledFor: lunchTime,
        payload: { mealType: 'lunch', planned: todaysMeals?.lunch },
      })
    }

    // === Cena ===
    // 2-3 horas antes de dormir
    const dinnerTime = parseTime(todayStr, profile.sleepTime)
    dinnerTime.setHours(dinnerTime.getHours() - 3)
    if (dinnerTime > today) {
      toSchedule.push({
        type: 'meal',
        title: 'Hora de cenar',
        body: todaysMeals?.dinner?.name
          ? `Plan: ${todaysMeals.dinner.name}`
          : '¿Qué vas a cenar? Recuerda registrar.',
        scheduledFor: dinnerTime,
        payload: { mealType: 'dinner', planned: todaysMeals?.dinner },
      })
    }

    // === Ejercicio ===
    if (todaysExercise && todaysExercise.exercises?.length > 0) {
      // Si es día laboral: ejercicio después del trabajo (30 min después de workEnd)
      // Si no: ejercicio 1 hora después de despertar
      let exerciseTime: Date
      if (isWorkDay) {
        exerciseTime = parseTime(todayStr, profile.workEnd)
        exerciseTime.setMinutes(exerciseTime.getMinutes() + 30)
      } else {
        exerciseTime = parseTime(todayStr, profile.wakeTime)
        exerciseTime.setHours(exerciseTime.getHours() + 1)
      }
      if (exerciseTime > today) {
        toSchedule.push({
          type: 'exercise',
          title: 'Hora de entrenar',
          body: `${todaysExercise.focus}: ${todaysExercise.exercises.length} ejercicios, ${todaysExercise.totalMinutes || 30} min`,
          scheduledFor: exerciseTime,
          payload: { planned: todaysExercise },
        })
      }
    }

    // === Feedback al final del día ===
    const feedbackTime = parseTime(todayStr, profile.sleepTime)
    feedbackTime.setMinutes(feedbackTime.getMinutes() - 30)
    if (feedbackTime > today) {
      toSchedule.push({
        type: 'feedback',
        title: 'Tu resumen del día',
        body: 'Genera tu feedback diario con la IA',
        scheduledFor: feedbackTime,
      })
    }

    // Insertar todas
    const created = await Promise.all(
      toSchedule.map(n =>
        db.notification.create({
          data: {
            type: n.type,
            title: n.title,
            body: n.body,
            scheduledFor: n.scheduledFor,
            payload: n.payload ? JSON.stringify(n.payload) : null,
          },
        })
      )
    )

    return NextResponse.json({ scheduled: created.length, items: created })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function parseTime(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d
}

function subtractMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m - minutes
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}
