import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function POST() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({
      where: { userId },
      include: { schedules: true },
    })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })
    if (!settings?.notificationsEnabled) {
      return NextResponse.json({ scheduled: 0, message: 'Notificaciones deshabilitadas' })
    }

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const dayName = today.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
    const dayShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]

    const todaySchedule = profile.schedules.find(s => {
      const days: string[] = JSON.parse(s.days || '[]')
      return days.some(d => d.toLowerCase().startsWith(dayShort))
    })

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

    const mealPlan = await db.mealPlan.findFirst({ orderBy: { createdAt: 'desc' } })
    let todaysMeals: any = null
    if (mealPlan) {
      const parsed = JSON.parse(mealPlan.content)
      todaysMeals = (parsed.days || []).find((d: any) => d.day?.toLowerCase() === dayName)
    }

    const exercisePlan = await db.exercisePlan.findFirst({ orderBy: { createdAt: 'desc' } })
    let todaysExercise: any = null
    if (exercisePlan) {
      const parsed = JSON.parse(exercisePlan.content)
      todaysExercise = (parsed.days || []).find((d: any) => d.day?.toLowerCase() === dayName)
    }

    const breakfastTime = parseTime(todayStr, profile.wakeTime)
    breakfastTime.setMinutes(breakfastTime.getMinutes() + 15)
    if (breakfastTime > today) {
      toSchedule.push({
        type: 'meal',
        title: 'Hora del desayuno',
        body: todaysMeals?.breakfast?.name ? `Plan: ${todaysMeals.breakfast.name}` : '¿Qué vas a desayunar?',
        scheduledFor: breakfastTime,
        payload: { mealType: 'breakfast', planned: todaysMeals?.breakfast },
      })
    }

    if (todaySchedule) {
      const lunchTime = parseTime(todayStr, todaySchedule.lunchStart)
      if (lunchTime > today) {
        toSchedule.push({
          type: 'meal',
          title: todaySchedule.isFreeDay ? 'Hora de comer (día libre)' : `Hora de comer - ${todaySchedule.label}`,
          body: todaysMeals?.lunch?.name ? `Plan: ${todaysMeals.lunch.name}` : 'Es tu hora de comida',
          scheduledFor: lunchTime,
          payload: { mealType: 'lunch', planned: todaysMeals?.lunch, scheduleLabel: todaySchedule.label },
        })
      }
    }

    const dinnerTime = parseTime(todayStr, profile.sleepTime)
    dinnerTime.setHours(dinnerTime.getHours() - 3)
    if (dinnerTime > today) {
      toSchedule.push({
        type: 'meal',
        title: 'Hora de cenar',
        body: todaysMeals?.dinner?.name ? `Plan: ${todaysMeals.dinner.name}` : '¿Qué vas a cenar?',
        scheduledFor: dinnerTime,
        payload: { mealType: 'dinner', planned: todaysMeals?.dinner },
      })
    }

    if (todaysExercise && todaysExercise.exercises?.length > 0) {
      let exerciseTime: Date
      if (todaySchedule && !todaySchedule.isFreeDay) {
        exerciseTime = parseTime(todayStr, todaySchedule.workEnd)
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
          payload: { planned: todaysExercise, scheduleLabel: todaySchedule?.label },
        })
      }
    }

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
