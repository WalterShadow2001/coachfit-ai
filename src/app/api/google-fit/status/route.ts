import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

/**
 * GET /api/google-fit/status
 * Devuelve si Google Fit está conectado y si las credenciales de la app están configuradas
 */
export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID

    return NextResponse.json({
      appConfigured: Boolean(clientId),
      connected: profile?.googleFitConnected || false,
      lastSync: profile?.googleFitLastSync || null,
      instructions: clientId ? null : {
        title: 'Para conectar Google Fit (y Samsung Health)',
        steps: [
          '1. Ve a https://console.cloud.google.com/',
          '2. Crea un proyecto nuevo (ej: CoachFit AI)',
          '3. En el menú lateral: APIs y servicios → Biblioteca',
          '4. Busca "Fitness API" y habilítala',
          '5. Ve a APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth',
          '6. Tipo: Aplicación web',
          '7. Oríenes autorizados: https://coachfit-ai-phi.vercel.app',
          '8. URI de redirección: https://coachfit-ai-phi.vercel.app/api/google-fit/callback',
          '9. Copia el Client ID y Client Secret',
          '10. Ve a https://vercel.com/wpn/coachfit-ai/settings/environment-variables',
          '11. Agrega: GOOGLE_FIT_CLIENT_ID, GOOGLE_FIT_CLIENT_SECRET, GOOGLE_FIT_REDIRECT_URI',
          '',
          'Para que los datos de Samsung Health aparezcan:',
          '1. Abre Samsung Health en tu celular',
          '2. Ajustes → Samsung Health → Conectar con Google Fit',
          '3. Activa la sincronización',
          '4. Tus datos de Samsung Health se enviarán a Google Fit automáticamente',
          '5. Nuestra app lee de Google Fit y obtiene tus pasos, ejercicio, etc.',
        ],
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
