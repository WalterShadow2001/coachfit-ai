import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * GET /api/heart-rate
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const minutes = Number(searchParams.get('minutes') || '10')
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const samples = await db.heartRateSample.findMany({
      where: { timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    })

    const latest = samples[0] || null

    // Stats de los últimos X minutos
    const bpms = samples.map(s => s.bpm)
    const stats = bpms.length > 0 ? {
      current: bpms[0],
      avg: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
      max: Math.max(...bpms),
      min: Math.min(...bpms),
      samples: bpms.length,
    } : null

    return NextResponse.json({
      latest: latest ? { bpm: latest.bpm, timestamp: latest.timestamp, source: latest.source } : null,
      stats,
      history: samples.reverse().map(s => ({ bpm: s.bpm, timestamp: s.timestamp })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/heart-rate
 * Recibe una muestra de ritmo cardíaco (desde Samsung Health / Google Fit / Bluetooth)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bpm, source } = body as { bpm: number; source?: string }

    if (!bpm || typeof bpm !== 'number' || bpm < 30 || bpm > 220) {
      return NextResponse.json({ error: 'BPM inválido (debe ser 30-220)' }, { status: 400 })
    }

    const sample = await db.heartRateSample.create({
      data: {
        bpm: Math.round(bpm),
        source: source || 'manual',
      },
    })

    return NextResponse.json({ ok: true, sample })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/heart-rate
 * Limpia muestras antiguas (>24h)
 */
export async function DELETE() {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = await db.heartRateSample.deleteMany({
      where: { timestamp: { lt: dayAgo } },
    })
    return NextResponse.json({ ok: true, deleted: result.count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
