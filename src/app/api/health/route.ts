import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    return NextResponse.json({
      connected: {
        samsungHealth: profile?.samsungHealthConnected || false,
        googleFit: profile?.googleFitConnected || false,
        any: (profile?.samsungHealthConnected || false) || (profile?.googleFitConnected || false),
      },
      lastSync: {
        samsungHealth: profile?.samsungHealthLastSync || null,
        googleFit: profile?.googleFitLastSync || null,
      },
      heartRateMonitoring: profile?.heartRateMonitoring || false,
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
    const { source } = body as { source: string }
    const sourceStr = source || 'manual'

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const update: any = {}
    if (sourceStr === 'samsung_health' || sourceStr === 'health_connect') {
      update.samsungHealthConnected = true
      update.samsungHealthLastSync = new Date()
    } else if (sourceStr === 'google_fit') {
      update.googleFitConnected = true
      update.googleFitLastSync = new Date()
    }

    if (Object.keys(update).length > 0) {
      await db.userProfile.update({ where: { id: profile.id }, data: update })
    }

    return NextResponse.json({ ok: true, message: `Conectado: ${sourceStr}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source') || 'all'

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    const update: any = {}
    if (source === 'samsung_health' || source === 'all') {
      update.samsungHealthConnected = false
      update.samsungHealthLastSync = null
    }
    if (source === 'google_fit' || source === 'all') {
      update.googleFitConnected = false
      update.googleFitLastSync = null
    }
    await db.userProfile.update({ where: { id: profile.id }, data: update })

    return NextResponse.json({ ok: true, message: `${source} desconectado` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
