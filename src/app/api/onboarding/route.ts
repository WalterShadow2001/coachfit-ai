import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ profile: null, settings: null, needsAuth: true }, { status: 200 })
    }

    const profile = await db.userProfile.findFirst({
      where: { userId },
      include: { schedules: true },
    })
    const settings = await db.settings.findFirst({
      where: { id: `default-${userId}` },
    })
    return NextResponse.json({ profile, settings })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
    }

    const body = await req.json()

    // Validación mínima
    const required = ['name', 'age', 'gender', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel', 'budgetPerWeek', 'wakeTime', 'sleepTime', 'goal']
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        return NextResponse.json({ error: `Campo requerido: ${f}` }, { status: 400 })
      }
    }

    // Validar que tenga al menos 1 horario
    const schedules = body.schedules || []
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Debes agregar al menos 1 horario' }, { status: 400 })
    }

    // Si ya existe, actualizar; si no, crear
    const existing = await db.userProfile.findFirst({ where: { userId } })
    const data: any = {
      userId,
      name: String(body.name),
      age: Number(body.age),
      gender: String(body.gender),
      heightCm: Number(body.heightCm),
      weightKg: Number(body.weightKg),
      targetWeightKg: Number(body.targetWeightKg),
      activityLevel: String(body.activityLevel),
      budgetPerWeek: Number(body.budgetPerWeek),
      wakeTime: String(body.wakeTime),
      sleepTime: String(body.sleepTime),
      restrictions: JSON.stringify(body.restrictions || []),
      allergies: JSON.stringify(body.allergies || []),
      dislikedFoods: JSON.stringify(body.dislikedFoods || []),
      equipment: JSON.stringify(body.equipment || []),
      goal: String(body.goal),
    }
    // Campos opcionales (ubicación y meta de tiempo)
    if (body.city !== undefined) data.city = body.city || null
    if (body.state !== undefined) data.state = body.state || null
    if (body.latitude !== undefined) data.latitude = body.latitude ? Number(body.latitude) : null
    if (body.longitude !== undefined) data.longitude = body.longitude ? Number(body.longitude) : null
    if (body.locationDetected !== undefined) data.locationDetected = Boolean(body.locationDetected)
    if (body.targetWeeks !== undefined) data.targetWeeks = body.targetWeeks ? Number(body.targetWeeks) : null
    if (body.targetDate !== undefined && body.targetDate) {
      data.targetDate = new Date(body.targetDate)
    }

    let profile
    if (existing) {
      profile = await db.userProfile.update({ where: { id: existing.id }, data })
      // Borrar horarios anteriores y crear nuevos
      await db.workSchedule.deleteMany({ where: { profileId: existing.id } })
      for (const s of schedules) {
        await db.workSchedule.create({
          data: {
            profileId: existing.id,
            label: String(s.label || 'Horario'),
            days: JSON.stringify(s.days || []),
            workStart: String(s.workStart || '09:00'),
            workEnd: String(s.workEnd || '18:00'),
            lunchStart: String(s.lunchStart || '14:00'),
            lunchEnd: String(s.lunchEnd || '15:00'),
            isFreeDay: Boolean(s.isFreeDay || false),
            notes: s.notes || null,
          },
        })
      }
    } else {
      profile = await db.userProfile.create({ data })
      for (const s of schedules) {
        await db.workSchedule.create({
          data: {
            profileId: profile.id,
            label: String(s.label || 'Horario'),
            days: JSON.stringify(s.days || []),
            workStart: String(s.workStart || '09:00'),
            workEnd: String(s.workEnd || '18:00'),
            lunchStart: String(s.lunchStart || '14:00'),
            lunchEnd: String(s.lunchEnd || '15:00'),
            isFreeDay: Boolean(s.isFreeDay || false),
            notes: s.notes || null,
          },
        })
      }
    }

    // Asegurar settings por defecto para este usuario
    await db.settings.upsert({
      where: { id: `default-${userId}` },
      update: {},
      create: { id: `default-${userId}` },
    })

    // Devolver con horarios
    const profileWithSchedules = await db.userProfile.findUnique({
      where: { id: profile.id },
      include: { schedules: true },
    })

    return NextResponse.json({ profile: profileWithSchedules })
  } catch (e: any) {
    console.error('Onboarding error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
