import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/sessions
 * Devuelve sesiones de ejercicio (con ruta GPS)
 * ?status=active → solo sesiones activas
 * ?id=xxx → sesión específica
 * ?limit=N → últimas N sesiones (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit') || '50')

    if (id) {
      const session = await db.exerciseSession.findUnique({ where: { id } })
      if (!session) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
      return NextResponse.json({
        session: {
          ...session,
          route: JSON.parse(session.route || '[]'),
        },
      })
    }

    const where: any = {}
    if (status) where.status = status

    const sessions = await db.exerciseSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      sessions: sessions.map(s => ({
        ...s,
        route: JSON.parse(s.route || '[]'),
        routePoints: JSON.parse(s.route || '[]').length,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/sessions
 * Crea o actualiza una sesión de ejercicio con GPS
 * body: { type, startTime, route?: [{lat, lng, timestamp, ...}], status, ... }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Si trae ID, actualizar sesión existente (ej: añadir puntos GPS)
    if (body.id) {
      const existing = await db.exerciseSession.findUnique({ where: { id: body.id } })
      if (!existing) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

      const update: any = {}
      if (body.route !== undefined) update.route = JSON.stringify(body.route)
      if (body.status) update.status = body.status
      if (body.endTime) update.endTime = new Date(body.endTime)
      if (body.durationMin !== undefined) update.durationMin = Number(body.durationMin)
      if (body.caloriesBurn !== undefined) update.caloriesBurn = Number(body.caloriesBurn)
      if (body.distanceMeters !== undefined) update.distanceMeters = Number(body.distanceMeters)
      if (body.avgPace) update.avgPace = body.avgPace
      if (body.avgHeartRate !== undefined) update.avgHeartRate = Number(body.avgHeartRate)
      if (body.maxHeartRate !== undefined) update.maxHeartRate = Number(body.maxHeartRate)
      if (body.notes !== undefined) update.notes = body.notes
      if (body.name !== undefined) update.name = body.name

      const updated = await db.exerciseSession.update({ where: { id: body.id }, data: update })
      return NextResponse.json({
        session: { ...updated, route: JSON.parse(updated.route || '[]') },
      })
    }

    // Crear nueva sesión
    const session = await db.exerciseSession.create({
      data: {
        type: String(body.type || 'running'),
        name: body.name || null,
        startTime: body.startTime ? new Date(body.startTime) : new Date(),
        endTime: body.endTime ? new Date(body.endTime) : null,
        durationMin: Number(body.durationMin) || 0,
        caloriesBurn: Number(body.caloriesBurn) || 0,
        distanceMeters: Number(body.distanceMeters) || 0,
        avgPace: body.avgPace || null,
        avgHeartRate: body.avgHeartRate ? Number(body.avgHeartRate) : null,
        maxHeartRate: body.maxHeartRate ? Number(body.maxHeartRate) : null,
        route: JSON.stringify(body.route || []),
        status: String(body.status || 'active'),
        notes: body.notes || null,
      },
    })

    return NextResponse.json({
      session: { ...session, route: JSON.parse(session.route || '[]') },
    })
  } catch (e: any) {
    console.error('Session POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/sessions?id=xxx
 * Elimina una sesión
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    await db.exerciseSession.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
