import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

let zaiInstance: ZAI | null = null

function getZAI(): ZAI {
  if (!zaiInstance) {
    if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
      zaiInstance = new ZAI({
        baseUrl: process.env.ZAI_BASE_URL,
        apiKey: process.env.ZAI_API_KEY,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
        token: process.env.ZAI_TOKEN,
      } as any)
    } else {
      const candidates = ['/etc/.z-ai-config', path.join(process.cwd(), '.z-ai-config')]
      let cfg: any = { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'Z.ai' }
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            cfg = JSON.parse(fs.readFileSync(p, 'utf-8'))
            break
          }
        } catch {}
      }
      zaiInstance = new ZAI(cfg)
    }
  }
  return zaiInstance
}

function safeParse(text: string): any | null {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('[')
    if (start === -1) return null
    let depth = 0
    let endIdx = -1
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++
      else if (cleaned[i] === ']') {
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
 * GET /api/prices
 * Devuelve los precios guardados para la ciudad del usuario
 * ?category=Proteínas para filtrar
 * ?refresh=true para forzar nueva consulta a la IA
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh = searchParams.get('refresh') === 'true'
    const category = searchParams.get('category')

    const profile = await db.userProfile.findFirst()
    if (!profile) {
      return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })
    }
    if (!profile.city) {
      return NextResponse.json({
        error: 'Sin ubicación. Detecta tu ubicación primero en Perfil.',
        needsLocation: true,
      }, { status: 400 })
    }

    // Buscar precios existentes (menos de 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let where: any = {
      city: profile.city,
      lastChecked: { gte: thirtyDaysAgo },
    }
    if (category) where.category = category

    let prices = await db.localPrice.findMany({ where, orderBy: { category: 'asc' } })

    // Si no hay o si pidió refresh, consultar IA
    if (prices.length === 0 || refresh) {
      const aiPrices = await fetchPricesFromAI(profile.city, profile.state || '')
      if (aiPrices && aiPrices.length > 0) {
        // Borrar anteriores de esa ciudad
        await db.localPrice.deleteMany({ where: { city: profile.city } })
        // Crear nuevos
        for (const p of aiPrices) {
          await db.localPrice.create({
            data: {
              productName: p.productName,
              category: p.category,
              price: Number(p.price),
              store: p.store || null,
              city: profile.city,
              state: profile.state,
              unit: p.unit || null,
              source: 'ai_estimate',
              confidence: Number(p.confidence) || 0.7,
            },
          })
        }
        // Re-leer
        prices = await db.localPrice.findMany({
          where: { city: profile.city },
          orderBy: { category: 'asc' },
        })
      }
    }

    // Agrupar por categoría
    const grouped: Record<string, any[]> = {}
    for (const p of prices) {
      if (!grouped[p.category]) grouped[p.category] = []
      grouped[p.category].push(p)
    }

    return NextResponse.json({
      city: profile.city,
      state: profile.state,
      totalProducts: prices.length,
      prices: grouped,
      lastUpdated: prices[0]?.lastChecked || null,
    })
  } catch (e: any) {
    console.error('Prices GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/prices
 * Permite al usuario actualizar manualmente un precio
 * body: { productName, category, price, store?, unit? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profile = await db.userProfile.findFirst()
    if (!profile || !profile.city) {
      return NextResponse.json({ error: 'Sin ubicación' }, { status: 400 })
    }

    const price = await db.localPrice.create({
      data: {
        productName: String(body.productName),
        category: String(body.category),
        price: Number(body.price),
        store: body.store || null,
        city: profile.city,
        state: profile.state,
        unit: body.unit || null,
        source: 'user_input',
        confidence: 1.0,
      },
    })

    return NextResponse.json({ ok: true, price })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * Consulta a la IA para obtener precios locales estimados
 * La IA no tiene acceso a internet pero conoce rangos de precios típicos por ciudad
 */
async function fetchPricesFromAI(city: string, state: string): Promise<any[] | null> {
  try {
    const zai = getZAI()

    const userPrompt = `Necesito una lista de precios aproximados (en MXN) de productos básicos en supermercados de ${city}, ${state || 'México'}.

Considera tiendas como: Alsuper, Ahorrera, Soriana, HEB, Walmart, Bodega Aurrera, Mercado local.

Devuelve JSON con 30 productos distribuidos en estas categorías: Proteínas, Verduras, Frutas, Granos, Lácteos, Otros.

Cada producto debe tener:
- productName: nombre del producto + presentación (ej: "Pechuga de pollo 1kg", "Huevo blanco 12pz")
- category: una de las categorías anteriores
- price: precio aproximado en MXN (número, no string)
- store: tienda donde es más barato (ej: "Ahorrera", "Bodega Aurrera")
- unit: "kg", "pz", "lt", "g", "pack"
- confidence: 0.5-1.0 (qué tan seguro estás del precio)

Ejemplo:
[
  {"productName":"Pechuga de pollo 1kg","category":"Proteínas","price":145,"store":"Ahorrera","unit":"kg","confidence":0.8},
  {"productName":"Huevo blanco 12pz","category":"Proteínas","price":48,"store":"Bodega Aurrera","unit":"pz","confidence":0.9}
]

Devuelve SOLO el JSON array, sin texto adicional.`

    const response: any = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en precios de supermercado en México. Devuelves SOLO JSON válido con datos realistas basados en tu conocimiento. Si no conoces la ciudad exacta, usa precios promedio de México.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    })

    const content = response?.choices?.[0]?.message?.content || ''
    const parsed = safeParse(content)
    return parsed
  } catch (e: any) {
    console.error('AI prices error:', e)
    // Fallback: precios genéricos de México
    return getFallbackPrices()
  }
}

function getFallbackPrices(): any[] {
  return [
    // Proteínas
    { productName: 'Pechuga de pollo 1kg', category: 'Proteínas', price: 145, store: 'Ahorrera', unit: 'kg', confidence: 0.7 },
    { productName: 'Carne molida de res 1kg', category: 'Proteínas', price: 165, store: 'Bodega Aurrera', unit: 'kg', confidence: 0.7 },
    { productName: 'Huevo blanco 12pz', category: 'Proteínas', price: 48, store: 'Bodega Aurrera', unit: 'pz', confidence: 0.9 },
    { productName: 'Atún en agua 140g', category: 'Proteínas', price: 22, store: 'Ahorrera', unit: 'pz', confidence: 0.8 },
    { productName: 'Lentejas 1kg', category: 'Proteínas', price: 35, store: 'Mercado', unit: 'kg', confidence: 0.7 },
    { productName: 'Frijol negro 1kg', category: 'Proteínas', price: 38, store: 'Mercado', unit: 'kg', confidence: 0.7 },
    // Verduras
    { productName: 'Tomate 1kg', category: 'Verduras', price: 22, store: 'Mercado', unit: 'kg', confidence: 0.7 },
    { productName: 'Cebolla 1kg', category: 'Verduras', price: 18, store: 'Mercado', unit: 'kg', confidence: 0.8 },
    { productName: 'Lechuga 1pz', category: 'Verduras', price: 12, store: 'Mercado', unit: 'pz', confidence: 0.8 },
    { productName: 'Zanahoria 1kg', category: 'Verduras', price: 15, store: 'Mercado', unit: 'kg', confidence: 0.8 },
    { productName: 'Papa 1kg', category: 'Verduras', price: 20, store: 'Mercado', unit: 'kg', confidence: 0.8 },
    { productName: 'Brócoli 1pz', category: 'Verduras', price: 18, store: 'Soriana', unit: 'pz', confidence: 0.7 },
    // Frutas
    { productName: 'Manzana 1kg', category: 'Frutas', price: 35, store: 'Mercado', unit: 'kg', confidence: 0.7 },
    { productName: 'Plátano 1kg', category: 'Frutas', price: 18, store: 'Mercado', unit: 'kg', confidence: 0.8 },
    { productName: 'Naranja 1kg', category: 'Frutas', price: 15, store: 'Mercado', unit: 'kg', confidence: 0.8 },
    { productName: 'Aguacate 1pz', category: 'Frutas', price: 18, store: 'Mercado', unit: 'pz', confidence: 0.6 },
    // Granos
    { productName: 'Arroz blanco 1kg', category: 'Granos', price: 28, store: 'Bodega Aurrera', unit: 'kg', confidence: 0.8 },
    { productName: 'Avena 500g', category: 'Granos', price: 32, store: 'Soriana', unit: 'g', confidence: 0.7 },
    { productName: 'Tortillas de maíz 1kg', category: 'Granos', price: 22, store: 'Mercado', unit: 'kg', confidence: 0.9 },
    { productName: 'Pan integral 680g', category: 'Granos', price: 45, store: 'Walmart', unit: 'g', confidence: 0.7 },
    // Lácteos
    { productName: 'Leche entera 1L', category: 'Lácteos', price: 25, store: 'Bodega Aurrera', unit: 'lt', confidence: 0.9 },
    { productName: 'Yogur natural 1kg', category: 'Lácteos', price: 38, store: 'Soriana', unit: 'g', confidence: 0.7 },
    { productName: 'Queso panela 500g', category: 'Lácteos', price: 75, store: 'Ahorrera', unit: 'g', confidence: 0.7 },
    // Otros
    { productName: 'Aceite de canola 1L', category: 'Otros', price: 48, store: 'Bodega Aurrera', unit: 'lt', confidence: 0.8 },
    { productName: 'Nueces 200g', category: 'Otros', price: 85, store: 'Soriana', unit: 'g', confidence: 0.6 },
    { productName: 'Miel 500g', category: 'Otros', price: 75, store: 'Mercado', unit: 'g', confidence: 0.7 },
    { productName: 'Café 250g', category: 'Otros', price: 65, store: 'Bodega Aurrera', unit: 'g', confidence: 0.7 },
  ]
}
