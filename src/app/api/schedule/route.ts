import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Programa las notificaciones del día según el perfil del usuario y su plan
// Respeta los horarios específicos por día (WorkSchedule)
export async function POST() {
  try {
    const profile = await db.userProfile.findFirst({
      include: { schedules: true },
    })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const settings = await db.settings.findUnique({ where: { id: 'default' } })
    if (!settings?.notificationsEnabled) {
      return NextResponse.json({ scheduled: 0, message: 'Notificaciones deshabilitadas' })
    }

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const dayName = today.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()

    // Buscar el horario que aplica hoy
    // Día de la semana en formato corto (mon, tue, wed, thu, fri, sat, sun)
    const dayShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]

    const todaySchedule = profile.schedules.find(s => {
      const days: string[] = JSON.parse(s.days || '[]')
      return days.some(d => d.toLowerCase().startsWith(dayShort))
    })

    if (!todaySchedule) {
      // Si no hay horario para hoy, solo programar comidas básicas (desayuno/cena)
      console.log('No schedule found for', dayName, '- scheduling minimal notifications')
    }

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

    // === DESAYUNO === (15 min después de despertar, siempre)
    const breakfastTime = parseTime(todayStr, profile.wakeTime)
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

    // === LUNCH === (solo si hay horario de lunch hoy)
    if (todaySchedule) {
      const lunchTime = parseTime(todayStr, todaySchedule.lunchStart)
      if (lunchTime > today) {
        const msg = todaySchedule.isFreeDay
          ? (todaysMeals?.lunch?.name || 'Es tu día libre. Disfruta tu comida.')
          : `Plan: ${todaysMeals?.lunch?.name || 'Es tu hora de comida'}. ${todaySchedule.label}.`
        toSchedule.push({
          type: 'meal',
          title: todaySchedule.isFreeDay ? 'Hora de comer (día libre)' : `Hora de comer - ${todaySchedule.label}`,
          body: msg,
          scheduledFor: lunchTime,
          payload: { mealType: 'lunch', planned: todaysMeals?.lunch, scheduleLabel: todaySchedule.label },
        })
      }
    }

    // === CENA === (2-3 horas antes de dormir)
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

    // === EJERCICIO === (si hay plan hoy)
    if (todaysExercise && todaysExercise.exercises?.length > 0) {
      let exerciseTime: Date
      if (todaySchedule && !todaySchedule.isFreeDay) {
        // Día laboral: ejercicio 30 min después del trabajo
        exerciseTime = parseTime(todayStr, todaySchedule.workEnd)
        exerciseTime.setMinutes(exerciseTime.getMinutes() + 30)
      } else {
        // Día libre o sin horario: 1 hora después de despertar
        exerciseTime = parseTime(todayStr, profile.wakeTime)
        exerciseTime.setHours(exerciseTime.getHours() + 1)
      }
      if (exerciseTime > today) {
        toSchedule.push({
          type: 'exercise',
          title: 'Hora de entrenar',
          body: `${todaysExercise.focus}: ${todaysExercise.exercises.length} ejercicios, ${todaysExercise.totalMinutes || 30} min`,
          scheduledFor: exerciseTime,
          payload: { planned: todaysExercise, scheduleLabel: todaySchedule?.label },
        })
      }
    }

    // === FEEDBACK al final del día ===
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

    return NextResponse.json({
      scheduled: created.length,
      items: created,
      todaySchedule: todaySchedule ? {
        label: todaySchedule.label,
        isFreeDay: todaySchedule.isFreeDay,
        workStart: todaySchedule.workStart,
        workEnd: todaySchedule.workEnd,
        lunchStart: todaySchedule.lunchStart,
        lunchEnd: todaySchedule.lunchEnd,
      } : null,
    })
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
