import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const settings = await db.settings.findUnique({ where: { id: 'default' } })
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const data: any = {}
    if (body.notificationsEnabled !== undefined) data.notificationsEnabled = Boolean(body.notificationsEnabled)
    if (body.snoozeMinutes !== undefined) data.snoozeMinutes = Number(body.snoozeMinutes)
    if (body.maxRetries !== undefined) data.maxRetries = Number(body.maxRetries)
    if (body.retryIntervalMin !== undefined) data.retryIntervalMin = Number(body.retryIntervalMin)
    if (body.quietHoursStart !== undefined) data.quietHoursStart = String(body.quietHoursStart)
    if (body.quietHoursEnd !== undefined) data.quietHoursEnd = String(body.quietHoursEnd)

    const settings = await db.settings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    })
    return NextResponse.json({ settings })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
