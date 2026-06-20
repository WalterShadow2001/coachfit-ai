'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, Pause, Square, MapPin, Footprints, Clock, Flame, Route, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface GPSPoint {
  lat: number
  lng: number
  timestamp: string
  altitude?: number
  speed?: number
  accuracy?: number
}

interface Session {
  id?: string
  type: string
  startTime: string
  endTime?: string
  durationMin: number
  caloriesBurn: number
  distanceMeters: number
  avgPace?: string
  route: GPSPoint[]
  status: string
}

type ActivityType = 'running' | 'cycling' | 'walking' | 'hiking'

const ACTIVITIES: { value: ActivityType; label: string; icon: string; met: number }[] = [
  { value: 'running', label: 'Correr', icon: '🏃', met: 9.8 },
  { value: 'cycling', label: 'Ciclismo', icon: '🚴', met: 7.5 },
  { value: 'walking', label: 'Caminar', icon: '🚶', met: 3.5 },
  { value: 'hiking', label: 'Senderismo', icon: '🥾', met: 6.0 },
]

export default function GPSRunner() {
  const [activity, setActivity] = useState<ActivityType>('running')
  const [session, setSession] = useState<Session | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const watchIdRef = useRef<number | null>(null)
  const weightRef = useRef<number>(70) // se carga del perfil
  const elapsedRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cargar peso del perfil
  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(j => {
        if (j.profile?.weightKg) weightRef.current = j.profile.weightKg
      })
      .catch(() => {})
    // Cargar sesiones recientes
    fetch('/api/sessions?limit=5')
      .then(r => r.json())
      .then(j => setRecentSessions(j.sessions || []))
      .catch(() => {})
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startSession = useCallback(async () => {
    setError(null)
    if (!navigator.geolocation) {
      setError('GPS no disponible en este dispositivo')
      return
    }

    // Pedir permiso
    navigator.geolocation.getCurrentPosition(
      () => setPermission('granted'),
      (err) => {
        setPermission('denied')
        setError('Permiso de ubicación denegado. Actívalo en configuración.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    // Crear sesión
    const startTime = new Date().toISOString()
    const newSession: Session = {
      type: activity,
      startTime,
      durationMin: 0,
      caloriesBurn: 0,
      distanceMeters: 0,
      route: [],
      status: 'active',
    }

    // Guardar en backend
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activity,
          startTime,
          route: [],
          status: 'active',
        }),
      })
      const data = await res.json()
      if (data.session) {
        newSession.id = data.session.id
      }
    } catch (e: any) {
      console.error('Error creating session:', e)
    }

    setSession(newSession)
    elapsedRef.current = 0

    // Iniciar watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GPSPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString(),
          altitude: pos.coords.altitude || undefined,
          speed: pos.coords.speed || undefined,
          accuracy: pos.coords.accuracy || undefined,
        }
        setSession(prev => {
          if (!prev) return prev
          const newRoute = [...prev.route, point]
          const distance = calculateDistance(newRoute)
          const durationMin = elapsedRef.current / 60
          const met = ACTIVITIES.find(a => a.value === prev.type)?.met || 5
          const calories = Math.round(met * weightRef.current * durationMin / 60)
          const updated = {
            ...prev,
            route: newRoute,
            distanceMeters: distance,
            durationMin: Math.round(durationMin * 10) / 10,
            caloriesBurn: calories,
          }
          // Actualizar backend cada 5 puntos
          if (newRoute.length % 5 === 0 && prev.id) {
            fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: prev.id,
                route: newRoute,
                distanceMeters: distance,
                durationMin: updated.durationMin,
                caloriesBurn: calories,
              }),
            }).catch(() => {})
          }
          return updated
        })
      },
      (err) => {
        setError(`Error GPS: ${err.message}`)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    )

    // Timer para duración
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setSession(prev => {
        if (!prev) return prev
        const durationMin = elapsedRef.current / 60
        const met = ACTIVITIES.find(a => a.value === prev.type)?.met || 5
        const calories = Math.round(met * weightRef.current * durationMin / 60)
        return {
          ...prev,
          durationMin: Math.round(durationMin * 10) / 10,
          caloriesBurn: calories,
        }
      })
    }, 1000)

    toast.success('Sesión iniciada')
  }, [activity])

  const pauseSession = () => {
    setIsPaused(true)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resumeSession = () => {
    setIsPaused(false)
    // Re-iniciar watchPosition
    if (navigator.geolocation && session) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const point: GPSPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: new Date().toISOString(),
            altitude: pos.coords.altitude || undefined,
            speed: pos.coords.speed || undefined,
            accuracy: pos.coords.accuracy || undefined,
          }
          setSession(prev => {
            if (!prev) return prev
            const newRoute = [...prev.route, point]
            return { ...prev, route: newRoute, distanceMeters: calculateDistance(newRoute) }
          })
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      )
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1
        setSession(prev => {
          if (!prev) return prev
          const durationMin = elapsedRef.current / 60
          const met = ACTIVITIES.find(a => a.value === prev.type)?.met || 5
          const calories = Math.round(met * weightRef.current * durationMin / 60)
          return { ...prev, durationMin: Math.round(durationMin * 10) / 10, caloriesBurn: calories }
        })
      }, 1000)
    }
  }

  const finishSession = async () => {
    if (!session) return
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const endTime = new Date().toISOString()
    const finishedSession = { ...session, endTime, status: 'finished' }

    // Guardar en backend
    if (session.id) {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          endTime,
          status: 'finished',
          route: session.route,
          distanceMeters: session.distanceMeters,
          durationMin: session.durationMin,
          caloriesBurn: session.caloriesBurn,
          avgPace: session.durationMin > 0 && session.distanceMeters > 0
            ? formatPace(session.durationMin, session.distanceMeters)
            : undefined,
        }),
      })
    }

    // También registrar como ExerciseLog
    const activityLabel = ACTIVITIES.find(a => a.value === session.type)?.label || session.type
    await fetch('/api/log/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualName: `${activityLabel} (GPS)`,
        durationMin: Math.round(session.durationMin),
        intensity: session.type === 'running' ? 'high' : session.type === 'walking' ? 'low' : 'medium',
        caloriesBurn: session.caloriesBurn,
        notes: `Ruta GPS: ${(session.distanceMeters / 1000).toFixed(2)} km`,
        source: 'gps',
      }),
    })

    toast.success(`Sesión finalizada: ${(session.distanceMeters / 1000).toFixed(2)} km, ${session.caloriesBurn} kcal`)
    setSession(null)
    setIsPaused(false)
    elapsedRef.current = 0

    // Recargar sesiones recientes
    fetch('/api/sessions?limit=5')
      .then(r => r.json())
      .then(j => setRecentSessions(j.sessions || []))
      .catch(() => {})
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" /> GPS Runner
        </CardTitle>
        <CardDescription className="text-xs">
          Graba tus rutas de correr, ciclismo, caminata o senderismo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!session ? (
          <>
            {/* Selector de actividad */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Actividad</div>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITIES.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setActivity(a.value)}
                    className={`p-3 rounded-lg border-2 transition-colors text-left ${
                      activity === a.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="text-2xl">{a.icon}</div>
                    <div className="text-sm font-medium mt-1">{a.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={startSession} className="w-full" disabled={permission === 'denied'}>
              <Play className="w-4 h-4 mr-2" /> Iniciar sesión
            </Button>

            {error && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded flex items-start gap-2">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sesiones recientes */}
            {recentSessions.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Sesiones recientes</div>
                <div className="space-y-1">
                  {recentSessions.filter(s => s.status === 'finished').slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                      <span className="flex items-center gap-1">
                        {ACTIVITIES.find(a => a.value === s.type)?.icon} {s.name || ACTIVITIES.find(a => a.value === s.type)?.label}
                      </span>
                      <span className="text-muted-foreground">
                        {(s.distanceMeters / 1000).toFixed(2)}km · {s.durationMin}min · {s.caloriesBurn}kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Sesión en progreso */}
            <div className="bg-gradient-to-br from-primary to-emerald-700 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-white/20 text-white">
                  {ACTIVITIES.find(a => a.value === session.type)?.icon} {ACTIVITIES.find(a => a.value === session.type)?.label}
                </Badge>
                <Badge className={isPaused ? "bg-amber-500" : "bg-white/20 text-white"}>
                  {isPaused ? '⏸ Pausado' : '● En curso'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duración
                  </div>
                  <div className="text-2xl font-bold">{formatDuration(session.durationMin)}</div>
                </div>
                <div>
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <Footprints className="w-3 h-3" /> Distancia
                  </div>
                  <div className="text-2xl font-bold">
                    {(session.distanceMeters / 1000).toFixed(2)}<span className="text-sm ml-1">km</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Calorías
                  </div>
                  <div className="text-2xl font-bold">{session.caloriesBurn}<span className="text-sm ml-1">kcal</span></div>
                </div>
                <div>
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Puntos GPS
                  </div>
                  <div className="text-2xl font-bold">{session.route.length}</div>
                </div>
              </div>
            </div>

            {/* Mini mapa con la ruta */}
            {session.route.length > 1 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Ruta</div>
                <RouteMap route={session.route} />
              </div>
            )}

            {/* Controles */}
            <div className="flex gap-2">
              {!isPaused ? (
                <Button onClick={pauseSession} variant="outline" className="flex-1">
                  <Pause className="w-4 h-4 mr-2" /> Pausar
                </Button>
              ) : (
                <Button onClick={resumeSession} className="flex-1">
                  <Play className="w-4 h-4 mr-2" /> Continuar
                </Button>
              )}
              <Button onClick={finishSession} variant="destructive" className="flex-1">
                <Square className="w-4 h-4 mr-2" /> Finalizar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RouteMap({ route }: { route: GPSPoint[] }) {
  // SVG simple que dibuja la ruta normalizada
  if (route.length < 2) return null

  const lats = route.map(p => p.lat)
  const lngs = route.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001
  const range = Math.max(latRange, lngRange)

  const points = route.map(p => {
    const x = ((p.lng - minLng) / range) * 100
    const y = 100 - ((p.lat - minLat) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-2">
      <svg viewBox="0 0 100 100" className="w-full h-32">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-primary"
        />
        {route.length > 0 && (
          <circle
            cx={(route[0].lng - minLng) / range * 100}
            cy={100 - (route[0].lat - minLat) / range * 100}
            r="2"
            className="fill-emerald-500"
          />
        )}
        {route.length > 1 && (
          <circle
            cx={(route[route.length - 1].lng - minLng) / range * 100}
            cy={100 - (route[route.length - 1].lat - minLat) / range * 100}
            r="3"
            className="fill-rose-500"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Inicio</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Actual</span>
      </div>
    </div>
  )
}

function calculateDistance(route: GPSPoint[]): number {
  if (route.length < 2) return 0
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversine(route[i - 1], route[i])
  }
  return total
}

function haversine(a: GPSPoint, b: GPSPoint): number {
  const R = 6371000 // m
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatDuration(min: number): string {
  const totalSec = Math.round(min * 60)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatPace(min: number, meters: number): string {
  const km = meters / 1000
  if (km < 0.01) return '-'
  const paceMin = min / km
  const pMin = Math.floor(paceMin)
  const pSec = Math.round((paceMin - pMin) * 60)
  return `${pMin}:${String(pSec).padStart(2, '0')} /km`
}
