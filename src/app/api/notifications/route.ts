import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const now = new Date()
    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ notifications: [], enabled: false, needsOnboarding: true })

    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })
    const notificationsEnabled = settings?.notificationsEnabled ?? true

    if (!notificationsEnabled) {
      return NextResponse.json({ notifications: [], enabled: false })
    }

    const pending = await db.notification.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: now },
        OR: [{ snoozeUntil: null }, { snoozeUntil: { lte: now } }],
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10,
    })

    const snoozed = await db.notification.findMany({
      where: { status: 'snoozed', snoozeUntil: { lte: now } },
      orderBy: { snoozeUntil: 'asc' },
      take: 10,
    })

    return NextResponse.json({
      notifications: [...pending, ...snoozed],
      enabled: true,
      serverTime: now.toISOString(),
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
    const { id, action } = body
    const settings = await db.settings.findUnique({ where: { id: `default-${userId}` } })
    const snoozeMin = settings?.snoozeMinutes ?? 15

    const notif = await db.notification.findUnique({ where: { id } })
    if (!notif) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    if (action === 'acknowledge') {
      const updated = await db.notification.update({ where: { id }, data: { status: 'acknowledged' } })
      return NextResponse.json({ notification: updated })
    }

    if (action === 'snooze') {
      const snoozeUntil = new Date(Date.now() + snoozeMin * 60 * 1000)
      const updated = await db.notification.update({
        where: { id },
        data: { status: 'snoozed', snoozeUntil, retryCount: { increment: 1 } },
      })
      return NextResponse.json({ notification: updated })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const notif = await db.notification.create({
      data: {
        type: String(body.type || 'reminder'),
        title: String(body.title || ''),
        body: String(body.body || ''),
        scheduledFor: new Date(body.scheduledFor),
        payload: body.payload ? JSON.stringify(body.payload) : null,
      },
    })
    return NextResponse.json({ notification: notif })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
