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

function safeParse(text: string): any | null {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    if (start === -1) return null
    let depth = 0
    let endIdx = -1
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++
      else if (cleaned[i] === '}') {
        depth--
        if (depth === 0) { endIdx = i; break }
      }
    }
    if (endIdx === -1) return null
    return JSON.parse(cleaned.substring(start, endIdx + 1))
  } catch {
    return null
  }
}

/**
 * POST /api/ai-parse
 * Recibe texto hablado (transcrito) y el contexto (meal o exercise).
 * Devuelve JSON con campos parseados: name, calories, duration, intensity, onPlan, notes.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, context } = await req.json() as { text: string; context: 'meal' | 'exercise' }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const zai = getZAI()

    const systemPrompt = `Eres un asistente que interpreta lo que el usuario dijo por voz sobre su comida o ejercicio. Devuelves SOLO JSON válido con los campos extraídos. Si un campo no se menciona, devuelve null. La intensidad debe ser "low", "medium" o "high". onPlan es true si dijo que cumplió el plan, false si dijo que no, null si no mencionó.`

    const userPrompt = `Texto del usuario (transcripción de voz, puede tener errores): "${text}"

Contexto: ${context === 'meal' ? 'comida' : 'ejercicio'}

Devuelve JSON con esta estructura exacta:
{
  "name": "nombre corto de la comida o ejercicio (string, max 80 chars)",
  "calories": <número o null>,
  "duration": <número en minutos, o null>,
  "intensity": "low" | "medium" | "high" | null,
  "onPlan": true | false | null,
  "notes": "notas adicionales del usuario, o string vacío"
}

Ejemplos:
- "comí pollo con arroz y ensalada, como 500 calorías, sí seguí el plan" → {"name":"Pollo con arroz y ensalada","calories":500,"duration":null,"intensity":null,"onPlan":true,"notes":""}
- "hice 30 minutos de caminata, intensidad media, quemé como 200 calorías" → {"name":"Caminata","calories":200,"duration":30,"intensity":"medium","onPlan":null,"notes":""}
- "me comí unas tortas de ahogada, no era el plan pero estaban ricas" → {"name":"Tortas de ahogada","calories":null,"duration":null,"intensity":null,"onPlan":false,"notes":""}

SOLO devuelve el JSON, sin texto adicional.`

    const response: any = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const content = response?.choices?.[0]?.message?.content || ''
    const parsed = safeParse(content)

    if (!parsed) {
      return NextResponse.json({ error: 'No se pudo parsear', parsed: null }, { status: 422 })
    }

    // Limpieza: convertir strings numéricas a números
    if (parsed.calories && typeof parsed.calories === 'string') {
      parsed.calories = parseInt(parsed.calories, 10) || null
    }
    if (parsed.duration && typeof parsed.duration === 'string') {
      parsed.duration = parseInt(parsed.duration, 10) || null
    }
    if (parsed.onPlan === 'true') parsed.onPlan = true
    if (parsed.onPlan === 'false') parsed.onPlan = false

    return NextResponse.json({ parsed, raw: content })
  } catch (e: any) {
    console.error('AI parse error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
