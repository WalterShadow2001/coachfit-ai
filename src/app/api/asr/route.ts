import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

let zaiInstance: ZAI | null = null

function getZAI(): ZAI {
  if (!zaiInstance) {
    // 1. Variables de entorno (Vercel/producción)
    if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
      zaiInstance = new ZAI({
        baseUrl: process.env.ZAI_BASE_URL,
        apiKey: process.env.ZAI_API_KEY,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
        token: process.env.ZAI_TOKEN,
      })
      return zaiInstance
    }
    // 2. Archivo .z-ai-config (sandbox/local)
    const candidates = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(process.env.HOME || '/root', '.z-ai-config'),
      '/etc/.z-ai-config',
    ]
    let cfg: any = { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'Z.ai' }
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          cfg = JSON.parse(fs.readFileSync(p, 'utf-8'))
          break
        }
      } catch {}
    }
    zaiInstance = new ZAI({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      chatId: cfg.chatId,
      userId: cfg.userId,
      token: cfg.token,
    })
  }
  return zaiInstance
}

// POST: recibe audio base64, devuelve texto transcrito
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { audio } = body as { audio: string }

    if (!audio) {
      return NextResponse.json({ error: 'Audio base64 requerido' }, { status: 400 })
    }

    // Validar que sea base64
    if (typeof audio !== 'string' || audio.length < 100) {
      return NextResponse.json({ error: 'Audio inválido o demasiado corto' }, { status: 400 })
    }

    const zai = getZAI()
    const response: any = await zai.audio.asr.create({
      file_base64: audio,
    })

    const text = response?.text || response?.transcription || ''

    if (!text) {
      return NextResponse.json({ error: 'No se pudo transcribir el audio', text: '' }, { status: 422 })
    }

    return NextResponse.json({
      text: text.trim(),
      raw: response,
    })
  } catch (e: any) {
    console.error('ASR error:', e)
    return NextResponse.json({ error: e.message || 'Error en transcripción' }, { status: 500 })
  }
}
