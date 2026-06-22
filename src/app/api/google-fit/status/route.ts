import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID

    // Solo considerar "conectado" si hay access token guardado en DB
    const hasValidTokens = Boolean(profile?.googleFitAccessToken)
    const hasRefreshToken = Boolean(profile?.googleFitRefreshToken)

    return NextResponse.json({
      appConfigured: Boolean(clientId),
      connected: hasValidTokens && (profile?.googleFitConnected || false),
      hasValidTokens,
      hasRefreshToken,
      lastSync: profile?.googleFitLastSync || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
