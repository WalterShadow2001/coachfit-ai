import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ city: null, state: null, needsOnboarding: true })

    return NextResponse.json({
      city: profile.city,
      state: profile.state,
      country: profile.country || 'México',
      latitude: profile.latitude,
      longitude: profile.longitude,
      locationDetected: profile.locationDetected,
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
    const { latitude, longitude, city, state } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Latitud y longitud requeridas' }, { status: 400 })
    }

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        latitude,
        longitude,
        city: city || 'Desconocida',
        state: state || 'Desconocido',
        country: 'México',
        locationDetected: true,
      },
    })

    return NextResponse.json({
      ok: true,
      location: { city: city || 'Desconocida', state: state || 'Desconocido', country: 'México', latitude, longitude },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: { latitude: null, longitude: null, city: null, state: null, locationDetected: false },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
