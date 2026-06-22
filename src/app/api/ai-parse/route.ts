import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

/**
 * POST /api/ai-parse
 * Interpreta texto del usuario (escrito o transcripción de voz)
 * y extrae: name, calories, duration, intensity, onPlan, notes
 *
 * Usa parser local (regex + keywords) - NO necesita IA externa
 * Funciona perfectamente en Vercel sin configuración adicional
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const { text, context } = await req.json() as { text: string; context: 'meal' | 'exercise' }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const parsed = parseLocal(text, context || 'meal')
    return NextResponse.json({ parsed, source: 'local' })
  } catch (e: any) {
    console.error('Parse error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function parseLocal(text: string, context: 'meal' | 'exercise') {
  const lower = text.toLowerCase().trim()

  if (context === 'meal') {
    return parseMeal(lower, text)
  } else {
    return parseExercise(lower, text)
  }
}

function parseMeal(lower: string, original: string) {
  let name = original.trim()
  let calories: number | null = null
  let onPlan: boolean | null = null
  let notes = ''

  // Extraer calorías
  const calMatches = [
    lower.match(/(\d+)\s*(?:calor[ií]as?|kcal|cal)/),
    lower.match(/(\d+)\s*kilocalor/i),
    lower.match(/unas?\s*(\d+)/),
    lower.match(/como?\s*(\d{2,4})/),
  ]
  for (const m of calMatches) {
    if (m && m[1]) {
      const num = parseInt(m[1])
      if (num >= 20 && num <= 5000) {
        calories = num
        break
      }
    }
  }

  // Detectar si cumplió el plan
  const planYes = [
    'si', 'sí', 'segui', 'seguí', 'cumpli', 'cumplí', 'plan', 'lo que me dijiste',
    'tal cual', 'exacto', 'bien', 'correcto'
  ]
  const planNo = [
    'no', 'no segui', 'no seguí', 'no cumpli', 'no cumplí', 'otra cosa', 'diferente',
    'me salí', 'me sali', 'trampa', 'no pude'
  ]

  for (const p of planYes) {
    if (lower.includes(p) && !lower.includes('no ' + p)) {
      onPlan = true
      break
    }
  }
  for (const p of planNo) {
    if (lower.includes(p)) {
      onPlan = false
      break
    }
  }

  // Limpiar el nombre: remover números de calorías, "sí", "no", etc.
  name = original
    .replace(/\d+\s*(?:calor[ií]as?|kcal|cal)/gi, '')
    .replace(/\d+\s*kilocalor/gi, '')
    .replace(/unas?\s*\d+/gi, '')
    .replace(/como?\s*\d{2,4}/gi, '')
    .replace(/\b(s[ií]|segui|segu[ií]|cumpli|cumpl[ií])\b/gi, '')
    .replace(/\b(no|no segui|no cumpli|no pude)\b/gi, '')
    .replace(/\b(el plan|la dieta|el plan de comidas?)\b/gi, '')
    .replace(/\b(com[ií]|almorcé|almorce|cené|cene|desayuné|desayune)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Si el nombre quedó muy corto, usar el original
  if (name.length < 3) {
    name = original.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
  }
  if (name.length < 3) {
    name = 'Comida registrada'
  }

  // Capitalizar primera letra
  name = name.charAt(0).toUpperCase() + name.slice(1)

  return { name, calories, duration: null, intensity: null, onPlan, notes }
}

function parseExercise(lower: string, original: string) {
  let name = original.trim()
  let duration: number | null = null
  let calories: number | null = null
  let intensity: string | null = null
  let onPlan: boolean | null = null

  // Extraer duración en minutos
  const durMatches = [
    lower.match(/(\d+)\s*(?:min|minutos?)/),
    lower.match(/(\d+)\s*(?:hrs?|horas?)/),
    lower.match(/por\s*(\d+)\s*(?:min|minutos?)/),
    lower.match(/(\d+)\s*(?:min|minutos?)/),
  ]
  for (const m of durMatches) {
    if (m && m[1]) {
      const num = parseInt(m[1])
      if (lower.includes('hora') || lower.includes('hrs')) {
        duration = num * 60
      } else {
        duration = num
      }
      break
    }
  }

  // Extraer calorías
  const calMatch = lower.match(/(\d+)\s*(?:calor[ií]as?|kcal|cal)/)
  if (calMatch && calMatch[1]) {
    const num = parseInt(calMatch[1])
    if (num >= 10 && num <= 3000) calories = num
  }

  // Detectar intensidad
  if (lower.includes('suave') || lower.includes('leve') || lower.includes('tranquilo') || lower.includes('lento')) {
    intensity = 'low'
  } else if (lower.includes('intenso') || lower.includes('fuerte') || lower.includes('rápido') || lower.includes('rapido') || lower.includes('hiit')) {
    intensity = 'high'
  } else if (lower.includes('medio') || lower.includes('moderado')) {
    intensity = 'medium'
  } else if (duration && duration > 45) {
    intensity = 'high'
  } else if (duration && duration > 20) {
    intensity = 'medium'
  } else if (duration) {
    intensity = 'low'
  }

  // Detectar tipo de ejercicio
  const exerciseTypes: Record<string, string[]> = {
    'Correr': ['corr', 'trote', 'running', 'jogging', 'carrera'],
    'Caminar': ['camin', 'walk', 'paseo', 'marcha'],
    'Ciclismo': ['bici', 'cicl', 'bike', 'cycling', 'bicicleta'],
    'Pesas': ['pesas', 'fuerza', 'gym', 'gimnasio', 'mancuernas', 'weight'],
    'Yoga': ['yoga', 'estiramientos', 'meditación', 'meditacion'],
    'Natación': ['nad', 'swim', 'piscina', 'clavado'],
    'Senderismo': ['sender', 'hik', 'montañ', 'caminata en'],
    'CrossFit': ['crossfit', 'cross', 'wod'],
    'Boxeo': ['box', 'golpe', 'saco'],
    'Saltar cuerda': ['cuerda', 'jump rope', 'saltar'],
    'Flexiones': ['flexion', 'push', 'lagartijas'],
    'Sentadillas': ['sentadill', 'squats', 'cuclillas'],
    'Planchas': ['planch', 'plank', 'abd'],
    'Burpees': ['burpee'],
    'Cardio': ['cardio', 'aerob', 'zumba', 'baile'],
  }

  let detectedName = ''
  for (const [typeName, keywords] of Object.entries(exerciseTypes)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        detectedName = typeName
        break
      }
    }
    if (detectedName) break
  }

  // Si no detectamos tipo, usar el texto limpio
  if (!detectedName) {
    name = original
      .replace(/\d+\s*(?:min|minutos?|hrs?|horas?|calor[ií]as?|kcal|cal)/gi, '')
      .replace(/\b(hice|realicé|realice|completé|complete)\b/gi, '')
      .replace(/\b(suave|intenso|fuerte|medio|moderado)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (name.length < 3) name = 'Ejercicio'
    name = name.charAt(0).toUpperCase() + name.slice(1)
  } else {
    name = detectedName
  }

  // Si no hay duración, estimar según tipo
  if (!duration) {
    if (name === 'Pesas' || name === 'Yoga') duration = 30
    else if (name === 'Correr' || name === 'Ciclismo') duration = 30
    else if (name === 'Caminar') duration = 20
    else duration = 30
  }

  // Calorías estimadas si no las dijo
  if (!calories) {
    const metEstimates: Record<string, number> = {
      'Correr': 10, 'Caminar': 4, 'Ciclismo': 8, 'Pesas': 6,
      'Yoga': 3, 'Natación': 8, 'Senderismo': 7, 'CrossFit': 12,
      'Boxeo': 9, 'Saltar cuerda': 11, 'Flexiones': 8, 'Sentadillas': 8,
      'Planchas': 5, 'Burpees': 10, 'Cardio': 7,
    }
    const met = metEstimates[name] || 6
    calories = Math.round(met * 75 * (duration / 60)) // peso estimado 75kg
  }

  return { name, calories, duration, intensity, onPlan, notes: '' }
}
