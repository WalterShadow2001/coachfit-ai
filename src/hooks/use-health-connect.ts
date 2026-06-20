'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
  samsungHealthConnected: boolean
  googleFitConnected: boolean
  connected: boolean
  lastSync: { samsungHealth?: Date | null; googleFit?: Date | null }
  heartRateMonitoring: boolean
  todayData: HealthData | null
  weekData: Array<{ date: string; steps: number; caloriesBurned: number; activeMinutes: number }>
  // Ritmo cardíaco en tiempo real
  currentHeartRate: number | null
  heartRateHistory: Array<{ bpm: number; timestamp: string }>
  // Carga
  loading: boolean
  error: string | null
  // Acciones
  connect: (service: 'samsung_health' | 'google_fit') => Promise<boolean>
  syncFromDevice: (service: 'samsung_health' | 'google_fit') => Promise<HealthData | null>
  disconnect: (service: 'samsung_health' | 'google_fit' | 'all') => Promise<void>
  refresh: () => Promise<void>
  // Ritmo cardíaco
  startHeartRateMonitoring: () => Promise<void>
  stopHeartRateMonitoring: () => Promise<void>
  pushHeartRate: (bpm: number, source?: string) => Promise<void>
}

export function useHealthConnect(): UseHealthConnectResult {
  const [supported] = useState(false)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [samsungHealthConnected, setSamsungHealthConnected] = useState(false)
  const [googleFitConnected, setGoogleFitConnected] = useState(false)
  const [heartRateMonitoring, setHeartRateMonitoring] = useState(false)
  const [lastSync, setLastSync] = useState<{ samsungHealth?: Date | null; googleFit?: Date | null }>({})
  const [todayData, setTodayData] = useState<HealthData | null>(null)
  const [weekData, setWeekData] = useState<any[]>([])
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null)
  const [heartRateHistory, setHeartRateHistory] = useState<Array<{ bpm: number; timestamp: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connected = samsungHealthConnected || googleFitConnected

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setSamsungHealthConnected(data.connected?.samsungHealth || false)
      setGoogleFitConnected(data.connected?.googleFit || false)
      setHeartRateMonitoring(data.heartRateMonitoring || false)
      setLastSync({
        samsungHealth: data.lastSync?.samsungHealth ? new Date(data.lastSync.samsungHealth) : null,
        googleFit: data.lastSync?.googleFit ? new Date(data.lastSync.googleFit) : null,
      })
      setTodayData(data.today)
      setWeekData(data.week || [])
      if (data.heartRate) {
        setCurrentHeartRate(data.heartRate.bpm)
      }
      if (data.heartRateHistory) {
        setHeartRateHistory(data.heartRateHistory)
      }
      setPermission(connected ? 'granted' : 'prompt')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [connected])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(async (service: 'samsung_health' | 'google_fit'): Promise<boolean> => {
    setLoading(true)
    try {
      // En APK: aquí se llamaría al plugin nativo
      // const { Health } = await import('@capacitor-community/health')
      // await Health.requestAuthorization({ read: [...] })

      // Para web/demo: marcamos como conectado
      const profile = await fetch('/api/onboarding').then(r => r.json())
      if (profile.profile) {
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
            source: service,
          }),
        })
      }
      setPermission('granted')
      if (service === 'samsung_health') setSamsungHealthConnected(true)
      else setGoogleFitConnected(true)
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

  const syncFromDevice = useCallback(async (service: 'samsung_health' | 'google_fit'): Promise<HealthData | null> => {
    setLoading(true)
    setError(null)
    try {
      // En APK con Capacitor:
      // const { Health } = await import('@capacitor-community/health')
      // const steps = await Health.querySteps({...})
      // const calories = await Health.queryCaloriesActive({...})
      // ... etc

      throw new Error(`Para sincronizar datos de ${service}, necesitas la versión APK de la app`)
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(async (service: 'samsung_health' | 'google_fit' | 'all') => {
    setLoading(true)
    try {
      await fetch(`/api/health?source=${service}`, { method: 'DELETE' })
      if (service === 'samsung_health' || service === 'all') setSamsungHealthConnected(false)
      if (service === 'google_fit' || service === 'all') setGoogleFitConnected(false)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [refresh])

  const pushHeartRate = useCallback(async (bpm: number, source: string = 'manual') => {
    try {
      await fetch('/api/heart-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bpm, source }),
      })
      setCurrentHeartRate(bpm)
      setHeartRateHistory(prev => [...prev, { bpm, timestamp: new Date().toISOString() }].slice(-60))
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const startHeartRateMonitoring = useCallback(async () => {
    setHeartRateMonitoring(true)
    // En APK: usar Health Connect heart rate subscription
    // Por ahora, simulamos lectura cada 5 segundos (en real vendría del SDK)
    // El usuario puede medir manualmente con un botón "Medir ahora"
    if (hrIntervalRef.current) clearInterval(hrIntervalRef.current)
    // Polling al servidor cada 5s para ver si hay nuevas muestras (en APK real esto sería event-driven)
    hrIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/heart-rate?minutes=1')
        const data = await res.json()
        if (data.latest) {
          setCurrentHeartRate(data.latest.bpm)
        }
        if (data.history) {
          setHeartRateHistory(data.history)
        }
      } catch {}
    }, 5000)
  }, [])

  const stopHeartRateMonitoring = useCallback(async () => {
    setHeartRateMonitoring(false)
    if (hrIntervalRef.current) {
      clearInterval(hrIntervalRef.current)
      hrIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (hrIntervalRef.current) clearInterval(hrIntervalRef.current)
    }
  }, [])

  return {
    supported,
    permission,
    samsungHealthConnected,
    googleFitConnected,
    connected,
    lastSync,
    heartRateMonitoring,
    todayData,
    weekData,
    currentHeartRate,
    heartRateHistory,
    loading,
    error,
    connect,
    syncFromDevice,
    disconnect,
    refresh,
    startHeartRateMonitoring,
    stopHeartRateMonitoring,
    pushHeartRate,
  }
}

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
