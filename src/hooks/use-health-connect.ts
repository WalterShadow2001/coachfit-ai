'use client'

import { useState, useEffect, useCallback } from 'react'

interface HealthData {
  steps: number
  caloriesBurned: number
  caloriesResting: number
  distanceMeters: number
  activeMinutes: number
  heartRateAvg?: number
  heartRateMax?: number
  sleepHours?: number
  exercises: Array<{
    name: string
    type: string
    duration: number // minutos
    calories: number
    intensity?: 'low' | 'medium' | 'high'
    startTime?: string
    endTime?: string
  }>
}

interface UseHealthConnectResult {
  supported: boolean
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
  connected: boolean
  lastSync: Date | null
  todayData: HealthData | null
  weekData: Array<{ date: string; steps: number; caloriesBurned: number; activeMinutes: number }>
  loading: boolean
  error: string | null
  requestPermission: () => Promise<boolean>
  syncFromDevice: () => Promise<HealthData | null>
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Hook para integrar con Health Connect (Android 14+) o Samsung Health
 *
 * En PWA: usa la API experimental de Web Health (Chrome) o fallback a manual
 * En APK con Capacitor: usa @capacitor-community/health (plugin nativo)
 *
 * Por ahora, en navegador web no hay API nativa para Health Connect,
 * así que el hook:
 * 1. Detecta si está disponible
 * 2. Pide permisos si está disponible
 * 3. Lee datos del día
 * 4. Si no está disponible, permite entrada manual
 *
 * Para APK real, integrar Capacitor:
 *   import { Health } from '@capacitor-community/health'
 *   const granted = await Health.requestAuthorization({
 *     read: ['steps', 'calories.active', 'calories.basal', 'distance', 'activity', 'heart_rate', 'sleep']
 *   })
 */
export function useHealthConnect(): UseHealthConnectResult {
  const [supported] = useState(false) // Web no soporta nativamente (cambiar en Capacitor)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [todayData, setTodayData] = useState<HealthData | null>(null)
  const [weekData, setWeekData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setConnected(data.connected || false)
      setLastSync(data.lastSync ? new Date(data.lastSync) : null)
      setTodayData(data.today)
      setWeekData(data.week || [])
      setPermission(data.connected ? 'granted' : 'prompt')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // En web: no hay API nativa Health Connect disponible
    // En APK con Capacitor: esto llamaría al plugin nativo
    //
    // Por ahora marcamos como "conectado" para permitir entrada manual
    // Los datos reales vendrán del SDK nativo cuando se convierta a APK

    setLoading(true)
    try {
      // En APK: aquí se llamaría:
      // const { Health } = await import('@capacitor-community/health')
      // await Health.requestAuthorization({...})

      // Para web/demo: marcamos como conectado
      setPermission('granted')
      setConnected(true)

      // Guardar en backend que está "conectado" (en APK real, el plugin haría la lectura)
      const profile = await fetch('/api/onboarding').then(r => r.json())
      if (profile.profile) {
        // Crear registro vacío de HealthData para hoy
        await fetch('/api/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            steps: 0,
            caloriesBurned: 0,
            caloriesResting: 0,
            distanceMeters: 0,
            activeMinutes: 0,
            exercises: [],
            source: 'manual_setup',
          }),
        })
      }

      await refresh()
      return true
    } catch (e: any) {
      setError(e.message)
      setPermission('denied')
      return false
    } finally {
      setLoading(false)
    }
  }, [refresh])

  const syncFromDevice = useCallback(async (): Promise<HealthData | null> => {
    setLoading(true)
    setError(null)
    try {
      // En APK con Capacitor, aquí se leerían los datos nativos:
      //
      // const { Health } = await import('@capacitor-community/health')
      // const today = new Date()
      // today.setHours(0, 0, 0, 0)
      // const tomorrow = new Date(today)
      // tomorrow.setDate(tomorrow.getDate() + 1)
      //
      // const steps = await Health.querySteps({ startDate: today, endDate: tomorrow })
      // const calories = await Health.queryCaloriesActive({ startDate: today, endDate: tomorrow })
      // const heartRate = await Health.queryHeartRate({ startDate: today, endDate: tomorrow })
      // const exercises = await Health.queryWorkouts({ startDate: today, endDate: tomorrow })
      //
      // Y luego se enviarían al backend con POST /api/health

      // Para web: no podemos leer Health Connect desde el navegador
      // El usuario puede ingresar datos manualmente a través de otra UI
      throw new Error('Para sincronizar datos de Samsung Health, necesitas la versión APK de la app')
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/health', { method: 'DELETE' })
      setConnected(false)
      setPermission('prompt')
      setTodayData(null)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [refresh])

  return {
    supported,
    permission,
    connected,
    lastSync,
    todayData,
    weekData,
    loading,
    error,
    requestPermission,
    syncFromDevice,
    disconnect,
    refresh,
  }
}

/**
 * Submit manual health data (cuando el usuario no tiene APK y quiere registrar a mano)
 */
export async function submitManualHealthData(data: {
  steps?: number
  caloriesBurned?: number
  distanceMeters?: number
  activeMinutes?: number
  heartRateAvg?: number
  sleepHours?: number
  exercises?: any[]
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        ...data,
        source: 'manual',
      }),
    })
    if (!res.ok) {
      const e = await res.json()
      return { ok: false, error: e.error }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
