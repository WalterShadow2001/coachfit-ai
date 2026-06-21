/**
 * Generador de notificaciones creativas y únicas
 * No usa IA (funciona offline), genera mensajes variados y motivadores
 * basándose en el contexto del usuario y el tipo de notificación
 */

interface CreativeNotificationInput {
  type: 'meal' | 'exercise' | 'reminder' | 'feedback'
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  plannedName?: string
  exerciseFocus?: string
  exerciseMinutes?: number
  userName?: string
  retryCount?: number
  scheduleLabel?: string
}

interface CreativeNotification {
  title: string
  body: string
}

// Bancos de mensajes creativos por tipo
const BREAKFAST_MESSAGES = [
  { title: '¡Buenos días!', body: 'El desayuno es el combustible del día. ¿Qué vas a preparar?' },
  { title: 'Despierta y come', body: 'Tu metabolismo necesita arrancar. No te saltes el desayuno.' },
  { title: 'Hora de cargar pilas', body: 'Un buen desayuno = mejor energía toda la mañana.' },
  { title: 'Tu cuerpo te habla', body: 'Lleva horas sin comer. Escúchalo y desayuna bien.' },
  { title: 'Primer round del día', body: 'Desayuna como rey. ¿Qué tienes planeado?' },
  { title: 'No dejes que el hambre te gane', body: 'Desayuna ahora y evita los atracones después.' },
]

const LUNCH_MESSAGES = [
  { title: '¡Hora de comer!', body: 'Tu cuerpo necesita recargar energías. ¿Qué vas a comer?' },
  { title: 'Pausa activa', body: 'Deléitate con una buena comida. Te la ganaste.' },
  { title: 'Tu estómago reclama', body: 'Ya es hora. No dejes que el hambre te distraiga.' },
  { title: 'Combustible de mediodía', body: 'Come bien para rendir el resto del día.' },
  { title: '¡A la mesa!', body: 'Tu comida te espera. No la dejes enfriar.' },
  { title: 'Pausa merecida', body: 'Te has esforzado hoy. Come algo rico y saludable.' },
]

const DINNER_MESSAGES = [
  { title: 'Última comida del día', body: 'Cena ligero para dormir mejor. ¿Qué vas a preparar?' },
  { title: 'Hora de cerrar el día', body: 'Una cena suave te ayudará a descansar mejor.' },
  { title: 'No te vayas a dormir con hambre', body: 'Cena algo ligero y nutritivo.' },
  { title: 'Cena y relájate', body: 'El día ya fue suficiente. Come algo y desconecta.' },
  { title: 'El cierre perfecto', body: 'Termina el día con una buena cena. ¿Qué se te antoja?' },
]

const EXERCISE_MESSAGES = [
  { title: '¡Hora de moverse!', body: 'Tu cuerpo te lo va a agradecer. Pon tus tenis.' },
  { title: 'El ejercicio te llama', body: 'No lo pospongas. 30 minutos y listo.' },
  { title: 'Tu yo del futuro te lo agradece', body: 'Entrena ahora, descansa después.' },
  { title: 'Sudar es ganar', body: 'Cada repetición cuenta. ¡Vamos!' },
  { title: 'No encuentres excusas', body: 'Encuentra tiempo. Tu salud es prioridad.' },
  { title: 'Un paso más cerca de tu meta', body: 'Cada entrenamiento cuenta. ¡A darle!' },
  { title: 'Tu cuerpo puede más de lo que crees', body: 'Demuéstralo hoy. Empieza ya.' },
  { title: 'El único entrenamiento malo', body: 'es el que no haces. ¡Muévete!' },
]

const FEEDBACK_MESSAGES = [
  { title: '¿Cómo te fue hoy?', body: 'Es hora de ver tu progreso. Genera tu feedback diario.' },
  { title: 'Tu resumen del día', body: 'Veamos qué lograste hoy y qué podemos mejorar.' },
  { title: 'Hora de reflexionar', body: 'Tu feedback diario te ayuda a mejorar mañana.' },
  { title: 'Cierre del día', body: 'Revisemos juntos tu día. Genera tu análisis.' },
]

// Mensajes de reintento (cuando el usuario no responde)
const RETRY_MESSAGES = [
  { suffix: ' ¡No me ignores!', body_suffix: ' Te estoy esperando.' },
  { suffix: ' ¿Todo bien?', body_suffix: ' Solo necesito saber qué hiciste.' },
  { suffix: ' Sigo aquí', body_suffix: ' No me voy hasta que me respondas.' },
  { suffix: ' Último recordatorio', body_suffix: ' No dejes esto para mañana.' },
  { suffix: ' ¡Ya va!', body_suffix: ' Tu progreso depende de esto.' },
]

export function generateCreativeNotification(input: CreativeNotificationInput): CreativeNotification {
  const { type, mealType, plannedName, exerciseFocus, exerciseMinutes, userName, retryCount = 0, scheduleLabel } = input

  let baseMessages: CreativeNotification[] = []
  let customName = ''

  if (type === 'meal') {
    switch (mealType) {
      case 'breakfast':
        baseMessages = BREAKFAST_MESSAGES
        customName = plannedName || ''
        break
      case 'lunch':
        baseMessages = LUNCH_MESSAGES
        customName = plannedName || ''
        if (scheduleLabel) {
          baseMessages = [
            ...baseMessages,
            { title: `Pausa de ${scheduleLabel}`, body: 'Te ganaste este descanso. ¿Qué vas a comer?' },
          ]
        }
        break
      case 'dinner':
        baseMessages = DINNER_MESSAGES
        customName = plannedName || ''
        break
      default:
        baseMessages = LUNCH_MESSAGES
    }
  } else if (type === 'exercise') {
    baseMessages = EXERCISE_MESSAGES
    if (exerciseFocus) {
      baseMessages = [
        { title: `Hoy toca: ${exerciseFocus}`, body: `${exerciseMinutes || 30} minutos son todo lo que necesitas. ¡Tú puedes!` },
        { title: 'Tu rutina te espera', body: `${exerciseFocus}: ${exerciseMinutes || 30} min. Pon música y a darle.` },
        { title: '¡Es momento!', body: `Focus de hoy: ${exerciseFocus}. Solo ${exerciseMinutes || 30} minutos.` },
        ...baseMessages,
      ]
    }
  } else if (type === 'feedback') {
    baseMessages = FEEDBACK_MESSAGES
  }

  // Seleccionar mensaje aleatorio
  const randomIndex = Math.floor(Math.random() * baseMessages.length)
  let result = { ...baseMessages[randomIndex] }

  // Personalizar con nombre del usuario
  if (userName && Math.random() > 0.5) {
    result.title = `${userName}, ${result.title.toLowerCase()}`
  }

  // Personalizar con comida planeada
  if (customName) {
    result.body = `${result.body} Plan: ${customName}.`
  }

  // Agregar mensaje de reintento si es un retry
  if (retryCount > 0) {
    const retryIndex = (retryCount - 1) % RETRY_MESSAGES.length
    const retry = RETRY_MESSAGES[retryIndex]
    result.title += retry.suffix
    result.body += retry.body_suffix

    // Mensajes más urgentes en reintentos altos
    if (retryCount >= 3) {
      result.title = `⚠️ ${userName || 'Oye'}, ${result.title}`
    }
    if (retryCount >= 5) {
      result.title = `🚨 ÚLTIMO AVISO: ${result.title}`
    }
  }

  return result
}

/**
 * Genera múltiples notificaciones creativas diferentes
 * para que no se repitan en el mismo día
 */
export function generateUniqueNotifications(
  type: 'meal' | 'exercise' | 'reminder' | 'feedback',
  count: number,
  context: CreativeNotificationInput = { type }
): CreativeNotification[] {
  const results: CreativeNotification[] = []
  const used = new Set<number>()

  for (let i = 0; i < count; i++) {
    let attempts = 0
    let msg: CreativeNotification

    do {
      msg = generateCreativeNotification({ ...context, retryCount: i })
      attempts++
    } while (used.has(generateHash(msg.title + msg.body)) && attempts < 10)

    used.add(generateHash(msg.title + msg.body))
    results.push(msg)
  }

  return results
}

function generateHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}
