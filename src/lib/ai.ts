import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

let zaiInstance: ZAI | null = null

function loadConfig(): { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string } {
  // Buscar el archivo de configuración en orden de prioridad
  const candidates = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(process.env.HOME || '/root', '.z-ai-config'),
    '/etc/.z-ai-config',
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8')
        return JSON.parse(content)
      }
    } catch {}
  }
  // Fallback
  return { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'Z.ai' }
}

function getZAI(): ZAI {
  if (!zaiInstance) {
    const cfg = loadConfig()
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

export interface ScheduleBlock {
  label: string
  days: string[]
  workStart: string
  workEnd: string
  lunchStart: string
  lunchEnd: string
  isFreeDay: boolean
  notes?: string | null
}

export interface AIProfileSnapshot {
  name: string
  age: number
  gender: string
  heightCm: number
  weightKg: number
  targetWeightKg: number
  activityLevel: string
  budgetPerWeek: number
  schedules: ScheduleBlock[]
  wakeTime: string
  sleepTime: string
  restrictions: string[]
  allergies: string[]
  dislikedFoods: string[]
  equipment: string[]
  goal: string
}

export interface MealPlanDay {
  day: string
  breakfast: { name: string; ingredients: string[]; calories: number; prepTime: string }
  lunch: { name: string; ingredients: string[]; calories: number; prepTime: string }
  dinner: { name: string; ingredients: string[]; calories: number; prepTime: string }
  snacks: { name: string; ingredients: string[]; calories: number }[]
  totalCalories: number
}

export interface WeeklyMealPlan {
  weekStart: string
  days: MealPlanDay[]
  shoppingList: { category: string; items: string[] }[]
  estimatedCost: number
  notes: string
}

export interface ExerciseDay {
  day: string
  focus: string
  exercises: {
    name: string
    sets: number
    reps: string
    duration: string
    rest: string
    notes: string
  }[]
  totalMinutes: number
  caloriesBurn: number
}

export interface WeeklyExercisePlan {
  weekStart: string
  days: ExerciseDay[]
  notes: string
}

export interface DailyFeedback {
  date: string
  adherenceScore: number
  summary: string
  positives: string[]
  improvements: string[]
  tomorrowRecommendation: string
  motivationalMessage: string
}

function safeParse<T>(text: string): T | null {
  try {
    // Intentar extraer JSON del texto
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const startArr = cleaned.indexOf('[')
    let actualStart = -1
    if (start === -1) actualStart = startArr
    else if (startArr === -1) actualStart = start
    else actualStart = Math.min(start, startArr)
    if (actualStart === -1) return null
    // Encontrar el final balanceado
    let depth = 0
    let endChar = cleaned[actualStart]
    const openChar = cleaned[actualStart]
    const closeChar = openChar === '[' ? ']' : '}'
    let endIdx = -1
    for (let i = actualStart; i < cleaned.length; i++) {
      if (cleaned[i] === openChar) depth++
      else if (cleaned[i] === closeChar) {
        depth--
        if (depth === 0) {
          endIdx = i
          break
        }
      }
    }
    if (endIdx === -1) return null
    const jsonStr = cleaned.substring(actualStart, endIdx + 1)
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}

export async function generateWeeklyMealPlan(profile: AIProfileSnapshot): Promise<WeeklyMealPlan> {
  const zai = getZAI()
  const systemPrompt = `Eos un nutricionista profesional certificado. Generas planes alimenticios REALISTAS adaptados al presupuesto, horario y restricciones del usuario. Siempre respondes en español de México con ingredientes accesibles. Tu salida DEBE ser JSON válido siguiendo exactamente el esquema solicitado.`

  const userPrompt = `Genera un plan alimenticio para UNA SEMANA (lunes a domingo) en formato JSON.

DATOS DEL USUARIO:
- Nombre: ${profile.name}
- Edad: ${profile.age} años, Género: ${profile.gender}
- Peso: ${profile.weightKg} kg, Altura: ${profile.heightCm} cm
- Peso objetivo: ${profile.targetWeightKg} kg
- Nivel de actividad: ${profile.activityLevel}
- Objetivo: ${profile.goal === 'lose' ? 'bajar de peso' : profile.goal === 'gain' ? 'subir de masa muscular' : 'mantener'}
- Presupuesto semanal: $${profile.budgetPerWeek} MXN
- Horarios semanales:
${profile.schedules.map(s => `  • ${s.label}: ${s.isFreeDay ? 'DÍA LIBRE' : `trabaja ${s.workStart} a ${s.workEnd}`}, lunch ${s.lunchStart} a ${s.lunchEnd} (días: ${s.days.join(', ')})`).join('\n')}
- Despierta: ${profile.wakeTime}, Duerme: ${profile.sleepTime}
- Restricciones dietéticas: ${profile.restrictions.join(', ') || 'ninguna'}
- Alergias: ${profile.allergies.join(', ') || 'ninguna'}
- Foods que NO le gustan: ${profile.dislikedFoods.join(', ') || 'ninguno'}
- Equipo de ejercicio disponible: ${profile.equipment.join(', ')}

ESQUEMA JSON REQUERIDO (sigue EXACTAMENTE esta estructura):
{
  "weekStart": "2026-06-20",
  "days": [
    {
      "day": "lunes",
      "breakfast": { "name": "...", "ingredients": ["..."], "calories": 0, "prepTime": "10 min" },
      "lunch": { "name": "...", "ingredients": ["..."], "calories": 0, "prepTime": "20 min" },
      "dinner": { "name": "...", "ingredients": ["..."], "calories": 0, "prepTime": "15 min" },
      "snacks": [{ "name": "...", "ingredients": ["..."], "calories": 0 }],
      "totalCalories": 0
    }
  ],
  "shoppingList": [
    { "category": "Proteínas", "items": ["..."] },
    { "category": "Verduras", "items": ["..."] },
    { "category": "Granos", "items": ["..."] }
  ],
  "estimatedCost": 0,
  "notes": "Consejos generales para la semana"
}

REQUISITOS:
- 7 días (lunes a domingo)
- Calorías diarias calculadas según objetivo (déficit para bajar, superávit para subir)
- Comidas REALISTAS con ingredientes disponibles en México (Mercado, Oxxo, supermercado)
- Respeta presupuesto (estimatedCost <= ${profile.budgetPerWeek})
- Evita alérgenos y foods que no le gustan
- Lunch debe ser apto para preparar/transportar si trabaja fuera (considera los días laborales)
- Considera que el horario de lunch cambia según el día (ver lista de horarios)
- Breakfast rápido (max 15 min prep) ya que probablemente tiene prisa en la mañana

Responde SOLO con el JSON, sin texto adicional.`

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  })

  const content = response?.choices?.[0]?.message?.content || ''
  const parsed = safeParse<WeeklyMealPlan>(content)
  if (!parsed || !parsed.days || parsed.days.length === 0) {
    console.warn('Using fallback meal plan, content was:', content.slice(0, 500))
    return generateFallbackMealPlan(profile)
  }
  return parsed
}

function generateFallbackMealPlan(profile: AIProfileSnapshot): WeeklyMealPlan {
  const targetCalories = profile.goal === 'lose' ? 1500 : profile.goal === 'gain' ? 2500 : 2000
  const baseDay: MealPlanDay = {
    day: 'lunes',
    breakfast: { name: 'Avena con plátano y nueces', ingredients: ['1/2 taza avena', '1 plátano', '5 nueces', '1 taza leche'], calories: 380, prepTime: '10 min' },
    lunch: { name: 'Pollo a la plancha con arroz y ensalada', ingredients: ['150g pechuga de pollo', '1/2 taza arroz', 'lechuga', 'tomate', 'pepino'], calories: 480, prepTime: '20 min' },
    dinner: { name: 'Huevos revueltos con verduras y tortilla', ingredients: ['2 huevos', '1/2 taza verduras', '1 tortilla maíz'], calories: 350, prepTime: '10 min' },
    snacks: [{ name: 'Manzana', ingredients: ['1 manzana'], calories: 95 }, { name: 'Yogur natural', ingredients: ['1 yogur'], calories: 100 }],
    totalCalories: targetCalories,
  }

  const days: MealPlanDay[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((day, i) => ({
    ...baseDay,
    day,
    breakfast: i % 2 === 0 ? baseDay.breakfast : { name: 'Huevos revueltos con tortilla', ingredients: ['2 huevos', '1 tortilla', '1/4 aguacate'], calories: 350, prepTime: '10 min' },
    lunch: i % 3 === 0 ? baseDay.lunch : i % 3 === 1 ? { name: 'Tostadas de atún', ingredients: ['2 tostadas horneadas', '1 lata atún', 'lechuga', 'tomate'], calories: 420, prepTime: '15 min' } : { name: 'Ensalada de pollo', ingredients: ['150g pollo', 'lechuga', 'tomate', 'zanahoria', 'aceite oliva'], calories: 400, prepTime: '15 min' },
    dinner: i % 2 === 0 ? baseDay.dinner : { name: 'Sopa de lentejas', ingredients: ['1 taza lentejas', 'zanahoria', 'papa', 'cebolla'], calories: 380, prepTime: '25 min' },
  }))

  return {
    weekStart: new Date().toISOString().slice(0, 10),
    days,
    shoppingList: [
      { category: 'Proteínas', items: ['1 kg pechuga pollo', '1 docena huevos', '2 latas atún', '1 kg lentejas'] },
      { category: 'Verduras', items: ['lechuga', '3 tomate', '2 pepino', '1 kg zanahoria', '1 cebolla', '1 kg papa'] },
      { category: 'Frutas', items: ['3 manzana', '3 plátano', '1 aguacate'] },
      { category: 'Granos', items: ['1 kg avena', '1 kg arroz', '1 paquete tortillas maíz'] },
      { category: 'Lácteos', items: ['1 L leche', '4 yogur natural'] },
      { category: 'Otros', items: ['nueces', 'aceite oliva'] },
    ],
    estimatedCost: Math.min(profile.budgetPerWeek, 1200),
    notes: 'Plan de respaldo generado automáticamente. Personalízalo según tus preferencias. Bebe al menos 2 litros de agua al día.',
  }
}

export async function generateWeeklyExercisePlan(profile: AIProfileSnapshot): Promise<WeeklyExercisePlan> {
  const zai = getZAI()
  const systemPrompt = `Eres un entrenador personal certificado. Diseñas rutinas REALISTAS considerando el tiempo, equipo disponible y nivel del usuario. Respondes en español de México. IMPORTANTE: Tu salida DEBE ser JSON válido, sin texto adicional, sin comentarios, sin markdown.`

  const userPrompt = `Genera una rutina de ejercicio SEMANAL en JSON.

DATOS:
- Objetivo: ${profile.goal === 'lose' ? 'bajar de peso (prioridad cardio + fuerza)' : profile.goal === 'gain' ? 'ganar masa muscular (prioridad fuerza)' : 'mantener'}
- Peso: ${profile.weightKg} kg, Altura: ${profile.heightCm} cm, Edad: ${profile.age}
- Nivel actividad: ${profile.activityLevel}
- Horarios semanales:
${profile.schedules.map(s => `  • ${s.label}: ${s.isFreeDay ? 'DÍA LIBRE' : `trabaja ${s.workStart}-${s.workEnd}`} (días: ${s.days.join(', ')})`).join('\n')}
- Despierta: ${profile.wakeTime}, Duerme: ${profile.sleepTime}
- Equipo disponible: ${profile.equipment.join(', ') || 'solo peso corporal'}

Devuelve ÚNICAMENTE este JSON (sin texto antes ni después):
{"weekStart":"2026-06-20","days":[{"day":"lunes","focus":"Cardio + Core","exercises":[{"name":"Sentadillas","sets":3,"reps":"12-15","duration":"10 min","rest":"60s","notes":"Mantén la espalda recta"}],"totalMinutes":35,"caloriesBurn":250}],"notes":"Recomendaciones generales"}

REQUISITOS:
- 7 días (lunes a domingo)
- Al menos 1 día de descanso activo (focus: "Descanso activo" con ejercicios ligeros como caminata)
- Sesiones de 30-60 min máximo
- Si no tiene equipo, usa peso corporal
- Días laborables: rutinas más cortas (30-40 min)
- Fines de semana: rutinas más largas (45-60 min)`

  let parsed: WeeklyExercisePlan | null = null
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    })

    const content = response?.choices?.[0]?.message?.content || ''
    parsed = safeParse<WeeklyExercisePlan>(content)
  } catch (e) {
    console.error('Exercise plan AI error:', e)
  }

  // Fallback: rutina básica si la IA falla
  if (!parsed || !parsed.days || parsed.days.length === 0) {
    console.warn('Using fallback exercise plan')
    parsed = generateFallbackExercisePlan(profile)
  }

  return parsed
}

function generateFallbackExercisePlan(profile: AIProfileSnapshot): WeeklyExercisePlan {
  const hasEquipment = profile.equipment.some(e => !e.includes('Sin equipo'))
  const days: ExerciseDay[] = [
    { day: 'lunes', focus: 'Cardio + Core', exercises: [
      { name: 'Jumping jacks', sets: 3, reps: '30', duration: '3 min', rest: '30s', notes: 'Calentamiento' },
      { name: 'Sentadillas', sets: 3, reps: '15', duration: '5 min', rest: '45s', notes: 'Baja hasta 90°' },
      { name: 'Plancha', sets: 3, reps: '30s', duration: '3 min', rest: '30s', notes: 'Abdomen contraído' },
      { name: 'Caminata rápida', sets: 1, reps: '-', duration: '20 min', rest: '-', notes: 'Ritmo moderado' },
    ], totalMinutes: 35, caloriesBurn: 280 },
    { day: 'martes', focus: 'Tren superior', exercises: [
      { name: 'Push-ups (flexiones)', sets: 3, reps: '10-12', duration: '5 min', rest: '60s', notes: 'Rodillas si es necesario' },
      { name: 'Flexiones diamante', sets: 3, reps: '8-10', duration: '4 min', rest: '60s', notes: 'Tríceps' },
      { name: 'Plancha lateral', sets: 3, reps: '20s cada lado', duration: '3 min', rest: '30s', notes: 'Oblicuos' },
      { name: 'Mountain climbers', sets: 3, reps: '30', duration: '4 min', rest: '45s', notes: 'Cardio' },
    ], totalMinutes: 30, caloriesBurn: 220 },
    { day: 'miércoles', focus: 'Descanso activo', exercises: [
      { name: 'Caminata', sets: 1, reps: '-', duration: '30 min', rest: '-', notes: 'Ritmo relajado' },
      { name: 'Estiramientos', sets: 1, reps: '-', duration: '10 min', rest: '-', notes: 'Todo el cuerpo' },
    ], totalMinutes: 40, caloriesBurn: 150 },
    { day: 'jueves', focus: 'Tren inferior', exercises: [
      { name: 'Sentadillas', sets: 4, reps: '15', duration: '6 min', rest: '45s', notes: 'Espalda recta' },
      { name: 'Zancadas', sets: 3, reps: '12 cada pierna', duration: '6 min', rest: '45s', notes: 'Alternar piernas' },
      { name: 'Puente de glúteos', sets: 3, reps: '15', duration: '4 min', rest: '30s', notes: 'Aprieta glúteos' },
      { name: 'Pantorrillas', sets: 3, reps: '20', duration: '3 min', rest: '30s', notes: 'Sube en punta de pie' },
    ], totalMinutes: 35, caloriesBurn: 250 },
    { day: 'viernes', focus: 'HIIT', exercises: [
      { name: 'Burpees', sets: 4, reps: '10', duration: '6 min', rest: '60s', notes: 'Modifica si es necesario' },
      { name: 'Mountain climbers', sets: 4, reps: '40', duration: '5 min', rest: '45s', notes: 'Rápido' },
      { name: 'Jumping jacks', sets: 4, reps: '40', duration: '4 min', rest: '30s', notes: 'Mantén ritmo' },
      { name: 'Plancha', sets: 3, reps: '45s', duration: '4 min', rest: '30s', notes: 'Abdomen fuerte' },
    ], totalMinutes: 30, caloriesBurn: 320 },
    { day: 'sábado', focus: 'Cardio largo', exercises: [
      { name: 'Caminata/carrera', sets: 1, reps: '-', duration: '45 min', rest: '-', notes: 'Zona cardiaca 60-70%' },
      { name: 'Estiramientos', sets: 1, reps: '-', duration: '15 min', rest: '-', notes: 'Post-cardio' },
    ], totalMinutes: 60, caloriesBurn: 400 },
    { day: 'domingo', focus: 'Descanso y movilidad', exercises: [
      { name: 'Yoga / movilidad', sets: 1, reps: '-', duration: '20 min', rest: '-', notes: 'Recuperación' },
      { name: 'Caminata relajada', sets: 1, reps: '-', duration: '20 min', rest: '-', notes: 'Optional' },
    ], totalMinutes: 40, caloriesBurn: 120 },
  ]

  return {
    weekStart: new Date().toISOString().slice(0, 10),
    days,
    notes: 'Recuerda calentar 5 min antes y estirar 5 min después. Si tienes dolor, detente. La consistencia es más importante que la intensidad.',
  }
}

export async function generateDailyFeedback(input: {
  profile: AIProfileSnapshot
  date: string
  plannedMeals: any[]
  actualMeals: any[]
  plannedExercise: any[]
  actualExercise: any[]
  previousFeedback?: string
}): Promise<DailyFeedback> {
  const zai = getZAI()
  const systemPrompt = `Eres un coach personal que da feedback honesto pero motivador. Respondes en español de México con empatía pero sin rodeos. Tu salida DEBE ser JSON válido.`

  const userPrompt = `Analiza el día ${input.date} del usuario y da feedback.

PERFIL:
- ${input.profile.name}, ${input.profile.age} años, objetivo: ${input.profile.goal === 'lose' ? 'bajar de peso' : input.profile.goal === 'gain' ? 'ganar masa muscular' : 'mantener'}
- Peso actual: ${input.profile.weightKg} kg → meta: ${input.profile.targetWeightKg} kg
- Presupuesto: $${input.profile.budgetPerWeek} MXN/sem

COMIDAS PLANEADAS:
${JSON.stringify(input.plannedMeals, null, 2)}

COMIDAS REALES (lo que registró):
${JSON.stringify(input.actualMeals, null, 2)}

EJERCICIO PLANEADO:
${JSON.stringify(input.plannedExercise, null, 2)}

EJERCICIO REAL:
${JSON.stringify(input.actualExercise, null, 2)}

FEEDBACK ANTERIOR (para contexto):
${input.previousFeedback || 'primer día'}

ESQUEMA JSON REQUERIDO:
{
  "date": "${input.date}",
  "adherenceScore": 0,
  "summary": "Resumen de 2-3 oraciones del día",
  "positives": ["Lo que hizo bien"],
  "improvements": ["Lo que puede mejorar mañana"],
  "tomorrowRecommendation": "1-2 oraciones con recomendación concreta",
  "motivationalMessage": "Mensaje motivador personalizado (1-2 oraciones)"
}

adherenceScore: 0-100 (100 = perfect adherence)
Sé honesto: si no comió bien o no hizo ejercicio, el score debe ser bajo.
Si no registró nada, asume que no cumplió.

Responde SOLO con el JSON.`

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
  })

  const content = response?.choices?.[0]?.message?.content || ''
  const parsed = safeParse<DailyFeedback>(content)
  if (!parsed) {
    return {
      date: input.date,
      adherenceScore: 50,
      summary: 'No pude generar el análisis completo de tu día.',
      positives: ['Cualquier esfuerzo cuenta'],
      improvements: ['Intenta registrar tus comidas y ejercicio'],
      tomorrowRecommendation: 'Registra todo para que pueda darte feedback útil.',
      motivationalMessage: 'Cada día es una nueva oportunidad.',
    }
  }
  return parsed
}

export async function generateNotificationMessage(input: {
  type: 'meal' | 'exercise' | 'reminder' | 'feedback'
  context: string
  tone: 'gentle' | 'firm' | 'motivational'
  retryCount: number
}): Promise<{ title: string; body: string }> {
  const zai = getZAI()
  const toneMap = {
    gentle: 'amable y comprensivo',
    firm: 'firme pero respetuoso (como entrenador exigente)',
    motivational: 'motivador y enérgico',
  }

  const response = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `Eres un coach personal que envía notificaciones push. Respondes en español de México con tono ${toneMap[input.tone]}. Tu salida DEBE ser JSON: {"title": "max 30 chars", "body": "max 100 chars"}. NO uses emojis. Sé directo.`,
      },
      {
        role: 'user',
        content: `Tipo: ${input.type}\nContexto: ${input.context}\nIntento #: ${input.retryCount + 1}${input.retryCount > 0 ? ' (ya le recordaste antes y no respondió)' : ''}`,
      },
    ],
    temperature: 0.8,
  })

  const content = response?.choices?.[0]?.message?.content || ''
  const parsed = safeParse<{ title: string; body: string }>(content)
  if (!parsed) {
    // Fallback
    const fallbacks = {
      meal: {
        title: 'Hora de comer',
        body: input.retryCount > 0 ? 'No me has dicho qué comiste. Cuéntame.' : 'Es tu hora de comida. ¿Qué vas a comer?',
      },
      exercise: {
        title: 'Hora de moverte',
        body: input.retryCount > 0 ? 'Todavía no haces ejercicio. Vamos.' : 'Es momento de tu rutina. ¿La empezaste?',
      },
      reminder: {
        title: 'Recordatorio',
        body: 'Tienes algo pendiente.',
      },
      feedback: {
        title: 'Tu feedback del día',
        body: 'Ya tengo listo tu análisis diario.',
      },
    }
    return fallbacks[input.type]
  }
  return parsed
}

/**
 * IA ADAPTATIVA
 * Regenera SOLO el plan de ejercicio cuando el usuario no está cumpliendo
 * NO toca el plan de comidas (respeta presupuesto y preferencias)
 *
 * Estrategia:
 * - Si user no quemó suficientes calorías → aumentar duración/intensidad de ejercicio
 * - Si user no completó ejercicios → simplificar rutina o cambiar a ejercicios más fáciles
 * - Si user reporta fatiga → bajar intensidad pero mantener duración
 * - Si user tiene tiempo limitado → ejercicios HIIT más cortos pero efectivos
 */
export async function adaptExercisePlan(input: {
  profile: AIProfileSnapshot
  currentPlan: WeeklyExercisePlan
  adherenceData: {
    daysMissed: string[]
    avgAdherence: number
    lastFeedback?: string
    exerciseLogsLast7Days: any[]
    caloriesTarget: number
    caloriesActual: number
  }
}): Promise<{ newPlan: WeeklyExercisePlan; reason: string; changes: string[] }> {
  const zai = getZAI()

  const systemPrompt = `Eres un entrenador personal ADAPTATIVO. Cuando el usuario no cumple su rutina, ajustas SOLAMENTE el ejercicio (nunca la dieta). Respondes en español de México. Tu salida DEBE ser JSON válido con el nuevo plan y explicación de cambios.`

  const userPrompt = `El usuario NO está cumpliendo su plan de ejercicio. Necesito que regeneres SOLO la rutina de ejercicio (la dieta se mantiene igual, NO la cambies).

DATOS DEL USUARIO:
- ${input.profile.name}, ${input.profile.age} años, objetivo: ${input.profile.goal === 'lose' ? 'bajar de peso' : input.profile.goal === 'gain' ? 'ganar masa muscular' : 'mantener'}
- Peso: ${input.profile.weightKg} kg → meta: ${input.profile.targetWeightKg} kg
- Equipo: ${input.profile.equipment.join(', ') || 'peso corporal'}
- Horarios:
${input.profile.schedules.map(s => `  • ${s.label}: ${s.isFreeDay ? 'DÍA LIBRE' : `trabaja ${s.workStart}-${s.workEnd}`} (días: ${s.days.join(', ')})`).join('\n')}

PLAN ACTUAL DE EJERCICIO:
${JSON.stringify(input.currentPlan.days, null, 2)}

DATOS DE ADHERENCIA:
- Días perdidos (no hizo ejercicio): ${input.adherenceData.daysMissed.join(', ') || 'ninguno'}
- Adherencia promedio (7d): ${input.adherenceData.avgAdherence}%
- Calorías objetivo quemadas/semana: ${input.adherenceData.caloriesTarget}
- Calorías reales quemadas/semana: ${input.adherenceData.caloriesActual}
- Déficit calórico: ${input.adherenceData.caloriesTarget - input.adherenceData.caloriesActual} kcal

ÚLTIMO FEEDBACK DE LA IA:
${input.adherenceData.lastFeedback || 'sin feedback previo'}

EJERCICIOS REALIZADOS (7 días):
${JSON.stringify(input.adherenceData.exerciseLogsLast7Days.map(l => ({ name: l.actualName, duration: l.durationMin, calories: l.caloriesBurn })), null, 2)}

REGLAS CRÍTICAS:
1. NO cambies la dieta - solo el ejercicio
2. Ajusta intensidad y duración según el déficit calórico
3. Si faltaron muchas calorías → aumenta intensidad/duración de ejercicios
4. Si días perdidos > 3 → hace ejercicios más cortos (15-20 min) para que sea más fácil cumplir
5. Si días perdidos <= 2 → mantiene estructura pero aumenta intensidad en días que sí entrena
6. Considera su horario: en días laborales sesiones más cortas, fines de semana más largas

Devuelve JSON con esta estructura:
{
  "newPlan": {
    "weekStart": "${new Date().toISOString().slice(0, 10)}",
    "days": [
      {
        "day": "lunes",
        "focus": "...",
        "exercises": [
          { "name": "...", "sets": 3, "reps": "12-15", "duration": "10 min", "rest": "60s", "notes": "..." }
        ],
        "totalMinutes": 35,
        "caloriesBurn": 280
      }
    ],
    "notes": "Notas generales sobre el ajuste"
  },
  "reason": "1-2 oraciones explicando por qué se ajustó",
  "changes": ["lista de cambios concretos hechos al plan"]
}

Responde SOLO con el JSON.`

  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
    })

    const content = response?.choices?.[0]?.message?.content || ''
    const parsed = safeParse<{ newPlan: WeeklyExercisePlan; reason: string; changes: string[] }>(content)

    if (!parsed || !parsed.newPlan || !parsed.newPlan.days) {
      // Fallback: ajustar manualmente
      return generateFallbackAdaptation(input, content)
    }

    return parsed
  } catch (e) {
    console.error('Adapt exercise AI error:', e)
    return generateFallbackAdaptation(input, '')
  }
}

function generateFallbackAdaptation(input: any, rawContent: string): { newPlan: WeeklyExercisePlan; reason: string; changes: string[] } {
  const changes: string[] = []
  const days = [...(input.currentPlan.days || [])]

  const deficit = input.adherenceData.caloriesTarget - input.adherenceData.caloriesActual
  const missedDays = input.adherenceData.daysMissed.length

  if (deficit > 500) {
    // Aumentar intensidad significativamente
    changes.push('Aumenté intensidad: más series y reps en todos los ejercicios')
    changes.push('Agregué ejercicios de cardio extra para quemar más calorías')
    days.forEach(d => {
      d.exercises.forEach((ex: any) => {
        ex.sets = (ex.sets || 3) + 1
      })
      // Agregar un ejercicio de cardio extra
      d.exercises.push({
        name: 'Burpees',
        sets: 3,
        reps: '12',
        duration: '6 min',
        rest: '45s',
        notes: 'Agregado para compensar déficit calórico',
      })
      d.caloriesBurn = (d.caloriesBurn || 0) + 80
      d.totalMinutes = (d.totalMinutes || 0) + 6
    })
  } else if (missedDays > 3) {
    // Simplificar para que sea más fácil cumplir
    changes.push('Simplifiqué rutinas: sesiones más cortas (15-20 min) para que sean más fáciles de cumplir')
    changes.push('Enfoque en ejercicios compuestos de alta eficiencia')
    days.forEach(d => {
      // Mantener solo los 2 primeros ejercicios
      d.exercises = d.exercises.slice(0, 2)
      d.totalMinutes = Math.min(d.totalMinutes || 30, 20)
    })
  } else {
    // Ajuste leve
    changes.push('Aumenté intensidad ligeramente en días laborales')
    days.forEach((d: any, i: number) => {
      if (i < 5) { // días laborales
        d.exercises.forEach((ex: any) => {
          ex.reps = ex.reps ? ex.reps.replace(/(\d+)-(\d+)/, (m: string, a: string, b: string) => `${a}-${Number(b) + 2}`) : ex.reps
        })
      }
    })
  }

  return {
    newPlan: {
      weekStart: new Date().toISOString().slice(0, 10),
      days,
      notes: 'Plan ajustado automáticamente por bajo cumplimiento. ¡Tú puedes lograrlo!',
    },
    reason: `Detecté ${missedDays} días perdidos y un déficit de ${deficit} kcal. Ajusté la rutina para que sea más efectiva sin cambiar tu dieta.`,
    changes,
  }
}
