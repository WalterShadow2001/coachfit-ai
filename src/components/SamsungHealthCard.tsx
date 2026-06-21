'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  HeartPulse, Footprints, Flame, Clock, Activity, Moon, Plus,
  Watch, RefreshCw, Loader2, X, Sparkles, Smartphone, Heart,
  CheckCircle2, AlertCircle, Info
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function SamsungHealthCard() {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [samsungConnected, setSamsungConnected] = useState(false)
  const [googleFitAppConfigured, setGoogleFitAppConfigured] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [todayData, setTodayData] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [manualData, setManualData] = useState({
    steps: '', caloriesBurned: '', distanceMeters: '', activeMinutes: '',
    heartRateAvg: '', sleepHours: '',
  })

  // Cargar estado de Google Fit
  useEffect(() => {
    loadGoogleFitStatus()
    // Verificar si acabamos de volver del OAuth
    const url = new URL(window.location.href)
    const googleFitConnected = url.searchParams.get('google_fit_connected')
    if (googleFitConnected === 'true') {
      const accessToken = url.searchParams.get('access_token')
      if (accessToken) {
        // Guardar token en localStorage
        localStorage.setItem('google_fit_access_token', accessToken)
        const refreshToken = url.searchParams.get('refresh_token')
        if (refreshToken) localStorage.setItem('google_fit_refresh_token', refreshToken)
        // Sincronizar inmediatamente
        syncFromGoogleFit(accessToken)
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  const loadGoogleFitStatus = async () => {
    try {
      const res = await fetch('/api/google-fit/status')
      const data = await res.json()
      setGoogleFitAppConfigured(data.appConfigured)
      setConnected(data.connected)
      setSamsungConnected(false) // Samsung Health no es directamente conectable desde web
      if (data.lastSync) setLastSync(new Date(data.lastSync))
      if (data.instructions && !data.appConfigured) {
        // App no configurada, mostrar instrucciones
      }
    } catch (e) {
      // Ignorar
    } finally {
      setLoading(false)
    }
  }

  const connectGoogleFit = () => {
    if (!googleFitAppConfigured) {
      setInstructionsOpen(true)
      return
    }
    // Redirigir a OAuth de Google
    window.location.href = '/api/google-fit/auth'
  }

  const syncFromGoogleFit = async (token?: string) => {
    setSyncing(true)
    try {
      const accessToken = token || localStorage.getItem('google_fit_access_token')
      if (!accessToken) {
        toast.error('No hay sesión de Google Fit. Conecta tu cuenta primero.')
        setSyncing(false)
        return
      }
      const res = await fetch('/api/google-fit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTodayData(data.data)
      setConnected(true)
      setLastSync(new Date())
      toast.success(data.message)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const connectSamsung = async () => {
    try {
      await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), source: 'samsung_health', steps: 0, caloriesBurned: 0, exercises: [] }),
      })
      setSamsungConnected(true)
      toast.success('Samsung Health marcado como conectado')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const disconnect = async (service: string) => {
    try {
      await fetch(`/api/health?source=${service}`, { method: 'DELETE' })
      if (service === 'google_fit') {
        setConnected(false)
        localStorage.removeItem('google_fit_access_token')
        localStorage.removeItem('google_fit_refresh_token')
      }
      if (service === 'samsung_health') setSamsungConnected(false)
      toast.success('Desconectado')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleManualSubmit = async () => {
    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          steps: Number(manualData.steps) || 0,
          caloriesBurned: Number(manualData.caloriesBurned) || 0,
          distanceMeters: Number(manualData.distanceMeters) || 0,
          activeMinutes: Number(manualData.activeMinutes) || 0,
          heartRateAvg: Number(manualData.heartRateAvg) || undefined,
          sleepHours: Number(manualData.sleepHours) || undefined,
          source: 'manual',
        }),
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Datos guardados')
      setManualOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Watch className="w-5 h-5 text-primary" /> Salud conectada</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={connected ? 'border-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Watch className="w-5 h-5 text-primary" /> Salud conectada</CardTitle>
              <CardDescription className="text-xs">
                {connected ? `Google Fit conectado${lastSync ? ` · ${lastSync.toLocaleString('es-MX')}` : ''}` : 'Conecta para ver pasos, calorías y ejercicio automáticamente'}
              </CardDescription>
            </div>
            {connected && <Badge className="bg-primary"><Sparkles className="w-3 h-3 mr-1" /> Activo</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {!connected && !samsungConnected ? (
            <div className="text-center py-4">
              <Watch className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Conecta Samsung Health o Google Fit para registrar automáticamente tus pasos, calorías y ejercicio
              </p>
              <div className="space-y-2">
                <Button onClick={connectGoogleFit} className="w-full" disabled={syncing}>
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                  Conectar Google Fit
                </Button>
                <Button onClick={connectSamsung} variant="outline" className="w-full">
                  <Watch className="w-4 h-4 mr-2" /> Conectar Samsung Health
                </Button>
                <Button variant="ghost" onClick={() => setManualOpen(true)} className="w-full text-xs" size="sm">
                  <Plus className="w-3 h-3 mr-1" /> Registrar datos manualmente
                </Button>
              </div>
              {!googleFitAppConfigured && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <Info className="w-3 h-3 inline mr-1" />
                  Google Fit requiere configuración. <button onClick={() => setInstructionsOpen(true)} className="underline font-medium">Ver cómo</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Datos de hoy */}
              {todayData && (
                <div className="grid grid-cols-2 gap-2">
                  <StatCard icon={<Footprints className="w-4 h-4 text-blue-500" />} label="Pasos" value={todayData.steps?.toLocaleString() || '0'} />
                  <StatCard icon={<Flame className="w-4 h-4 text-orange-500" />} label="Cal activas" value={`${todayData.caloriesBurned || 0}`} unit="kcal" />
                  <StatCard icon={<Activity className="w-4 h-4 text-emerald-500" />} label="Distancia" value={todayData.distanceMeters ? (todayData.distanceMeters / 1000).toFixed(2) : '0'} unit="km" />
                  <StatCard icon={<Clock className="w-4 h-4 text-purple-500" />} label="Min activos" value={`${todayData.activeMinutes || 0}`} unit="min" />
                  {todayData.heartRateAvg && (
                    <StatCard icon={<HeartPulse className="w-4 h-4 text-rose-500" />} label="FC promedio" value={`${todayData.heartRateAvg}`} unit="bpm" />
                  )}
                </div>
              )}

              {/* Ejercicios detectados */}
              {todayData?.exercises?.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs text-muted-foreground mb-1">Ejercicios detectados ({todayData.exercises.length})</div>
                  <div className="space-y-1">
                    {todayData.exercises.map((ex: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-primary" /> {ex.name}</span>
                        <span className="text-muted-foreground">{ex.duration}min{ex.calories ? ` · ${ex.calories}kcal` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => syncFromGoogleFit()} disabled={syncing} className="flex-1">
                  {syncing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Sincronizar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setManualOpen(true)} className="flex-1">
                  <Plus className="w-3 h-3 mr-1" /> Manual
                </Button>
              </div>

              {/* Desconectar */}
              <div className="flex gap-2">
                {connected && (
                  <Button size="sm" variant="ghost" onClick={() => disconnect('google_fit')} className="text-destructive flex-1 text-xs">
                    <X className="w-3 h-3 mr-1" /> Desconectar Google Fit
                  </Button>
                )}
                {samsungConnected && (
                  <Button size="sm" variant="ghost" onClick={() => disconnect('samsung_health')} className="text-destructive flex-1 text-xs">
                    <X className="w-3 h-3 mr-1" /> Desconectar Samsung
                  </Button>
                )}
              </div>

              {/* Info Samsung Health → Google Fit */}
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-3 h-3 inline mr-1" />
                ¿Tienes Samsung Health? Activa "Conectar con Google Fit" en Samsung Health → Ajustes para que tus datos aparezcan aquí automáticamente.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de instrucciones */}
      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Google Fit + Samsung Health</DialogTitle>
            <DialogDescription>
              Para sincronizar automáticamente tus pasos y ejercicio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <div className="font-medium text-emerald-700 dark:text-emerald-300 mb-1">¿Cómo funciona?</div>
              <p className="text-xs text-muted-foreground">
                Samsung Health → Google Fit → CoachFit AI
                <br/>
                Tus datos de Samsung Health se envían a Google Fit (si lo activas), y nosotros leemos de Google Fit.
              </p>
            </div>
            <div className="font-medium">Pasos para configurar:</div>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
              <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" className="text-primary underline">Google Cloud Console</a></li>
              <li>Crea un proyecto nuevo (ej: CoachFit AI)</li>
              <li>Menú lateral: APIs y servicios → Biblioteca</li>
              <li>Busca "Fitness API" y haz clic en "Habilitar"</li>
              <li>Ve a Credenciales → Crear credenciales → ID de cliente OAuth</li>
              <li>Tipo: Aplicación web</li>
              <li>Orígenes autorizados: https://coachfit-ai-phi.vercel.app</li>
              <li>URI de redirección: https://coachfit-ai-phi.vercel.app/api/google-fit/callback</li>
              <li>Copia el Client ID y Client Secret</li>
              <li>Ve a <a href="https://vercel.com/wpn/coachfit-ai/settings/environment-variables" target="_blank" className="text-primary underline">Vercel</a> y agrega:
                <ul className="list-disc pl-4 mt-1">
                  <li>GOOGLE_FIT_CLIENT_ID</li>
                  <li>GOOGLE_FIT_CLIENT_SECRET</li>
                  <li>GOOGLE_FIT_REDIRECT_URI = https://coachfit-ai-phi.vercel.app/api/google-fit/callback</li>
                </ul>
              </li>
            </ol>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Para que Samsung Health envíe datos:</div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Abre Samsung Health en tu celular</li>
                <li>Ajustes → Samsung Health → Conectar con Google Fit</li>
                <li>Activa la sincronización</li>
                <li>¡Listo! Tus datos aparecerán aquí automáticamente</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setInstructionsOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal entrada manual */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar actividad manual</DialogTitle>
            <DialogDescription>Si no tienes Google Fit, puedes registrar a mano</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pasos</Label><Input type="number" value={manualData.steps} onChange={e => setManualData({...manualData, steps: e.target.value})} placeholder="8500" /></div>
            <div><Label>Cal activas</Label><Input type="number" value={manualData.caloriesBurned} onChange={e => setManualData({...manualData, caloriesBurned: e.target.value})} placeholder="320" /></div>
            <div><Label>Distancia (m)</Label><Input type="number" value={manualData.distanceMeters} onChange={e => setManualData({...manualData, distanceMeters: e.target.value})} placeholder="5800" /></div>
            <div><Label>Min activos</Label><Input type="number" value={manualData.activeMinutes} onChange={e => setManualData({...manualData, activeMinutes: e.target.value})} placeholder="45" /></div>
            <div><Label>FC (bpm)</Label><Input type="number" value={manualData.heartRateAvg} onChange={e => setManualData({...manualData, heartRateAvg: e.target.value})} placeholder="72" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualOpen(false)}>Cancelar</Button>
            <Button onClick={handleManualSubmit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="p-2 bg-muted rounded-lg">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="font-bold mt-0.5">{value}{unit && <span className="text-xs text-muted-foreground ml-1 font-normal">{unit}</span>}</div>
    </div>
  )
}
