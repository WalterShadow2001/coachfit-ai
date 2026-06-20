import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/location
 * Devuelve la ubicación guardada del usuario
 */
export async function GET() {
  try {
    const profile = await db.userProfile.findFirst()
    return NextResponse.json({
      city: profile?.city || null,
      state: profile?.state || null,
      country: profile?.country || 'México',
      latitude: profile?.latitude || null,
      longitude: profile?.longitude || null,
      locationDetected: profile?.locationDetected || false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/location
 * Guarda la ubicación del usuario (la recibe del frontend vía navigator.geolocation
 * + reverse geocoding con IA o servicio gratuito)
 *
 * body: { latitude, longitude, city?, state? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { latitude, longitude, city, state } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Latitud y longitud requeridas' }, { status: 400 })
    }

    // Si no enviaron city/state, hacer reverse geocoding con IA
    let finalCity = city
    let finalState = state
    if (!finalCity || !finalState) {
      const reverse = await reverseGeocode(latitude, longitude)
      finalCity = finalCity || reverse.city
      finalState = finalState || reverse.state
    }

    const profile = await db.userProfile.findFirst()
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        latitude,
        longitude,
        city: finalCity,
        state: finalState,
        country: 'México',
        locationDetected: true,
      },
    })

    return NextResponse.json({
      ok: true,
      location: {
        city: finalCity,
        state: finalState,
        country: 'México',
        latitude,
        longitude,
      },
    })
  } catch (e: any) {
    console.error('Location error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * Reverse geocoding usando IA (z-ai-web-dev-sdk)
 * Le pasa lat/lng y la IA devuelve ciudad/estado
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string }> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const fs = await import('fs')
    const path = await import('path')

    let cfg: any = { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'Z.ai' }
    // Intentar variables de entorno primero
    if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
      cfg = {
        baseUrl: process.env.ZAI_BASE_URL,
        apiKey: process.env.ZAI_API_KEY,
        token: process.env.ZAI_TOKEN,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
      }
    } else {
      // Archivo .z-ai-config
      const candidates = ['/etc/.z-ai-config', path.join(process.cwd(), '.z-ai-config')]
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            cfg = JSON.parse(fs.readFileSync(p, 'utf-8'))
            break
          }
        } catch {}
      }
    }

    const zai = new ZAI(cfg)
    const response: any = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un servicio de geocoding. Devuelves SOLO JSON válido con city y state. Sin texto adicional.',
        },
        {
          role: 'user',
          content: `¿En qué ciudad y estado de México está la coordenada lat=${lat}, lng=${lng}? Responde SOLO con: {"city": "...", "state": "..."}`,
        },
      ],
      temperature: 0.1,
    })

    const content = response?.choices?.[0]?.message?.content || ''
    const match = content.match(/\{[^}]+\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      return { city: parsed.city || 'Desconocida', state: parsed.state || 'Desconocido' }
    }
  } catch (e) {
    console.error('Reverse geocode error:', e)
  }
  return { city: 'Desconocida', state: 'Desconocido' }
}

/**
 * DELETE /api/location
 * Borra la ubicación guardada
 */
export async function DELETE() {
  try {
    const profile = await db.userProfile.findFirst()
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        latitude: null,
        longitude: null,
        city: null,
        state: null,
        locationDetected: false,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
