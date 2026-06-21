import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { generateCreativeNotification } from '@/lib/creative-notifications'

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

    // Limpiar notificaciones pendientes de hoy
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

    // Condiciones médicas para personalizar mensajes
    const medicalConditions = JSON.parse(profile.medicalConditions || '[]')
    const hasDiabetes = medicalConditions.includes('diabetes_type_1') || medicalConditions.includes('diabetes_type_2')

    // === DESAYUNO ===
    const breakfastTime = parseTime(todayStr, profile.wakeTime)
    breakfastTime.setMinutes(breakfastTime.getMinutes() + 15)
    if (breakfastTime > today) {
      const msg = generateCreativeNotification({
        type: 'meal',
        mealType: 'breakfast',
        plannedName: todaysMeals?.breakfast?.name,
        userName: profile.name,
      })
      toSchedule.push({
        type: 'meal',
        title: msg.title,
        body: msg.body,
        scheduledFor: breakfastTime,
        payload: { mealType: 'breakfast', planned: todaysMeals?.breakfast },
      })
    }

    // === LUNCH ===
    if (todaySchedule) {
      const lunchTime = parseTime(todayStr, todaySchedule.lunchStart)
      if (lunchTime > today) {
        const msg = generateCreativeNotification({
          type: 'meal',
          mealType: 'lunch',
          plannedName: todaysMeals?.lunch?.name,
          userName: profile.name,
          scheduleLabel: todaySchedule.label,
          retryCount: 0,
        })
        toSchedule.push({
          type: 'meal',
          title: msg.title,
          body: msg.body,
          scheduledFor: lunchTime,
          payload: { mealType: 'lunch', planned: todaysMeals?.lunch, scheduleLabel: todaySchedule.label },
        })
      }
    }

    // === CENA ===
    const dinnerTime = parseTime(todayStr, profile.sleepTime)
    dinnerTime.setHours(dinnerTime.getHours() - 3)
    if (dinnerTime > today) {
      const msg = generateCreativeNotification({
        type: 'meal',
        mealType: 'dinner',
        plannedName: todaysMeals?.dinner?.name,
        userName: profile.name,
      })
      toSchedule.push({
        type: 'meal',
        title: msg.title,
        body: msg.body,
        scheduledFor: dinnerTime,
        payload: { mealType: 'dinner', planned: todaysMeals?.dinner },
      })
    }

    // === EJERCICIO ===
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
        const msg = generateCreativeNotification({
          type: 'exercise',
          exerciseFocus: todaysExercise.focus,
          exerciseMinutes: todaysExercise.totalMinutes,
          userName: profile.name,
        })
        toSchedule.push({
          type: 'exercise',
          title: msg.title,
          body: msg.body,
          scheduledFor: exerciseTime,
          payload: { planned: todaysExercise, scheduleLabel: todaySchedule?.label },
        })
      }
    }

    // === Recordatorio de comida para diabéticos (entre comidas) ===
    if (hasDiabetes && todaySchedule && !todaySchedule.isFreeDay) {
      const midMorning = parseTime(todayStr, profile.wakeTime)
      midMorning.setHours(midMorning.getHours() + 3)
      if (midMorning > today && midMorning < parseTime(todayStr, todaySchedule.lunchStart)) {
        const msg = generateCreativeNotification({
          type: 'meal',
          mealType: 'snack',
          userName: profile.name,
        })
        toSchedule.push({
          type: 'meal',
          title: `🩺 Snack para tu diabetes`,
          body: `Como diabético, no debes pasar mucho tiempo sin comer. Toma un snack pequeño (nueces, fruta).`,
          scheduledFor: midMorning,
          payload: { mealType: 'snack', medical: 'diabetes' },
        })
      }
    }

    // === FEEDBACK al final del día ===
    const feedbackTime = parseTime(todayStr, profile.sleepTime)
    feedbackTime.setMinutes(feedbackTime.getMinutes() - 30)
    if (feedbackTime > today) {
      const msg = generateCreativeNotification({
        type: 'feedback',
        userName: profile.name,
      })
      toSchedule.push({
        type: 'feedback',
        title: msg.title,
        body: msg.body,
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
