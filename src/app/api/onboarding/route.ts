import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const profile = await db.userProfile.findFirst()
    const settings = await db.settings.findUnique({ where: { id: 'default' } })
    return NextResponse.json({ profile, settings })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validación mínima
    const required = ['name', 'age', 'gender', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel', 'budgetPerWeek', 'workStart', 'workEnd', 'workDays', 'lunchStart', 'lunchEnd', 'wakeTime', 'sleepTime', 'goal']
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        return NextResponse.json({ error: `Campo requerido: ${f}` }, { status: 400 })
      }
    }

    // Si ya existe, actualizar; si no, crear
    const existing = await db.userProfile.findFirst()
    const data = {
      name: String(body.name),
      age: Number(body.age),
      gender: String(body.gender),
      heightCm: Number(body.heightCm),
      weightKg: Number(body.weightKg),
      targetWeightKg: Number(body.targetWeightKg),
      activityLevel: String(body.activityLevel),
      budgetPerWeek: Number(body.budgetPerWeek),
      workStart: String(body.workStart),
      workEnd: String(body.workEnd),
      workDays: JSON.stringify(body.workDays || []),
      lunchStart: String(body.lunchStart),
      lunchEnd: String(body.lunchEnd),
      wakeTime: String(body.wakeTime),
      sleepTime: String(body.sleepTime),
      restrictions: JSON.stringify(body.restrictions || []),
      allergies: JSON.stringify(body.allergies || []),
      dislikedFoods: JSON.stringify(body.dislikedFoods || []),
      equipment: JSON.stringify(body.equipment || []),
      goal: String(body.goal),
    }

    let profile
    if (existing) {
      profile = await db.userProfile.update({ where: { id: existing.id }, data })
    } else {
      profile = await db.userProfile.create({ data })
    }

    // Asegurar settings por defecto
    await db.settings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    })

    return NextResponse.json({ profile })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
