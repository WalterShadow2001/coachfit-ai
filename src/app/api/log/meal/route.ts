import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    let logs = []
    if (date) {
      const start = new Date(date + 'T00:00:00')
      const end = new Date(date + 'T23:59:59')
      logs = await db.mealLog.findMany({
        where: { loggedAt: { gte: start, lte: end } },
        orderBy: { loggedAt: 'asc' },
      })
    } else {
      logs = await db.mealLog.findMany({ orderBy: { loggedAt: 'desc' }, take: 100 })
    }
    return NextResponse.json({ logs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const log = await db.mealLog.create({
      data: {
        type: String(body.type || 'snack'),
        plannedName: body.plannedName || null,
        actualName: String(body.actualName || ''),
        calories: body.calories ? Number(body.calories) : null,
        notes: body.notes || null,
        onPlan: body.onPlan === undefined ? null : Boolean(body.onPlan),
        source: body.source === 'voice' ? 'voice' : 'manual',
        syncStatus: 'pending',
      },
    })
    return NextResponse.json({ log })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await db.mealLog.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
