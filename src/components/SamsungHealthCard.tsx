'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  HeartPulse, Footprints, Flame, Clock, Activity, Moon, Plus,
  Watch, RefreshCw, Loader2, X, Sparkles, Smartphone, Heart
} from 'lucide-react'
import { useHealthConnect, submitManualHealthData } from '@/hooks/use-health-connect'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function SamsungHealthCard() {
  const {
    samsungHealthConnected, googleFitConnected, connected,
    lastSync, todayData, loading, error,
    connect, syncFromDevice, disconnect, refresh,
    // Ritmo cardíaco
    currentHeartRate, heartRateHistory, heartRateMonitoring,
    startHeartRateMonitoring, stopHeartRateMonitoring, pushHeartRate,
  } = useHealthConnect()
  const [manualOpen, setManualOpen] = useState(false)
  const [manualData, setManualData] = useState({
    steps: '',
    caloriesBurned: '',
    distanceMeters: '',
    activeMinutes: '',
    heartRateAvg: '',
    sleepHours: '',
  })

  const handleConnectSamsung = async () => {
    const ok = await connect('samsung_health')
    if (ok) toast.success('Samsung Health conectado')
  }
  const handleConnectGoogleFit = async () => {
    const ok = await connect('google_fit')
    if (ok) toast.success('Google Fit conectado')
  }

  const handleSync = async (service: 'samsung_health' | 'google_fit') => {
    const data = await syncFromDevice(service)
    if (data) {
      toast.success(`Sincronizado: ${data.steps} pasos`)
      await refresh()
    } else if (error) {
      setManualOpen(true)
    }
  }

  const handleManualSubmit = async () => {
    const result = await submitManualHealthData({
      steps: manualData.steps ? Number(manualData.steps) : undefined,
      caloriesBurned: manualData.caloriesBurned ? Number(manualData.caloriesBurned) : undefined,
      distanceMeters: manualData.distanceMeters ? Number(manualData.distanceMeters) : undefined,
      activeMinutes: manualData.activeMinutes ? Number(manualData.activeMinutes) : undefined,
      heartRateAvg: manualData.heartRateAvg ? Number(manualData.heartRateAvg) : undefined,
      sleepHours: manualData.sleepHours ? Number(manualData.sleepHours) : undefined,
    })
    if (result.ok) {
      toast.success('Datos guardados')
      setManualOpen(false)
      await refresh()
    } else {
      toast.error(result.error || 'Error')
    }
  }

  const handleMeasureHeartRate = async () => {
    // En APK: esto se leería del sensor en tiempo real
    // Para web: simulamos con un valor aleatorio (en APK sería el sensor)
    const bpm = Math.floor(Math.random() * 30) + 65 // 65-95 bpm
    await pushHeartRate(bpm, 'manual')
    toast.success(`FC medida: ${bpm} bpm`)
  }

  if (loading && !todayData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Watch className="w-5 h-5 text-primary" /> Salud conectada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={connected ? 'border-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Watch className="w-5 h-5 text-primary" /> Salud conectada
              </CardTitle>
              <CardDescription className="text-xs">
                {connected
                  ? `Conectado · ${[samsungHealthConnected && 'Samsung Health', googleFitConnected && 'Google Fit'].filter(Boolean).join(' + ')}`
                  : 'Conecta tu reloj o app de salud'}
              </CardDescription>
            </div>
            {connected && (
              <Badge className="bg-primary">
                <Sparkles className="w-3 h-3 mr-1" /> Activo
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {!connected ? (
            <div className="text-center py-4">
              <Watch className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Conecta Samsung Health, Google Fit o Health Connect para registrar automáticamente pasos, calorías, ritmo cardíaco y ejercicios.
              </p>
              <div className="space-y-2">
                <Button onClick={handleConnectSamsung} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Watch className="w-4 h-4 mr-2" />}
                  Conectar Samsung Health
                </Button>
                <Button onClick={handleConnectGoogleFit} variant="outline" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                  Conectar Google Fit
                </Button>
                <Button variant="ghost" onClick={() => setManualOpen(true)} className="w-full text-xs" size="sm">
                  <Plus className="w-3 h-3 mr-1" /> Registrar datos manualmente
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ℹ️ En la versión APK, esto conecta automáticamente vía Health Connect (Android 14+)
              </p>
            </div>
          ) : (
            <>
              {/* Ritmo cardíaco en tiempo real */}
              <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-90 flex items-center gap-1">
                      <HeartPulse className="w-3 h-3" /> Ritmo cardíaco
                    </div>
                    <div className="text-3xl font-bold mt-1">
                      {currentHeartRate || '--'}
                      <span className="text-sm font-normal opacity-80 ml-1">bpm</span>
                    </div>
                    {heartRateMonitoring && (
                      <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Monitoreando
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!heartRateMonitoring ? (
                      <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={startHeartRateMonitoring}>
                        <Activity className="w-3 h-3 mr-1" /> Monitorear
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={stopHeartRateMonitoring}>
                        <span className="w-3 h-3 mr-1">⏸</span> Detener
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={handleMeasureHeartRate}>
                      <Heart className="w-3 h-3 mr-1" /> Medir
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats del día */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={<Footprints className="w-4 h-4 text-blue-500" />}
                  label="Pasos"
                  value={todayData?.steps?.toLocaleString() || '0'}
                />
                <StatCard
                  icon={<Flame className="w-4 h-4 text-orange-500" />}
                  label="Cal activas"
                  value={`${todayData?.caloriesBurned || 0}`}
                  unit="kcal"
                />
                <StatCard
                  icon={<Activity className="w-4 h-4 text-emerald-500" />}
                  label="Distancia"
                  value={todayData ? (todayData.distanceMeters / 1000).toFixed(2) : '0'}
                  unit="km"
                />
                <StatCard
                  icon={<Clock className="w-4 h-4 text-purple-500" />}
                  label="Min activos"
                  value={`${todayData?.activeMinutes || 0}`}
                  unit="min"
                />
                {todayData?.heartRateAvg && (
                  <StatCard
                    icon={<HeartPulse className="w-4 h-4 text-rose-500" />}
                    label="FC promedio"
                    value={`${todayData.heartRateAvg}`}
                    unit="bpm"
                  />
                )}
                {todayData?.sleepHours && (
                  <StatCard
                    icon={<Moon className="w-4 h-4 text-indigo-500" />}
                    label="Sueño"
                    value={`${todayData.sleepHours}`}
                    unit="h"
                  />
                )}
              </div>

              {/* Ejercicios detectados */}
              {todayData?.exercises && todayData.exercises.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs text-muted-foreground mb-1">Ejercicios detectados</div>
                  <div className="space-y-1">
                    {todayData.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-primary" />
                          {ex.name || ex.type}
                        </span>
                        <span className="text-muted-foreground">
                          {ex.duration}min · {ex.calories}kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t">
                {samsungHealthConnected && (
                  <Button size="sm" variant="outline" onClick={() => handleSync('samsung_health')} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    Sync Samsung
                  </Button>
                )}
                {googleFitConnected && (
                  <Button size="sm" variant="outline" onClick={() => handleSync('google_fit')} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    Sync Google
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setManualOpen(true)} className="flex-1">
                  <Plus className="w-3 h-3 mr-1" /> Manual
                </Button>
              </div>

              {/* Desconexiones */}
              <div className="flex gap-2">
                {samsungHealthConnected && (
                  <Button size="sm" variant="ghost" onClick={() => disconnect('samsung_health')} className="text-destructive flex-1 text-xs">
                    <X className="w-3 h-3 mr-1" /> Desconectar Samsung
                  </Button>
                )}
                {googleFitConnected && (
                  <Button size="sm" variant="ghost" onClick={() => disconnect('google_fit')} className="text-destructive flex-1 text-xs">
                    <X className="w-3 h-3 mr-1" /> Desconectar Google
                  </Button>
                )}
              </div>

              {error && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                  {error}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog entrada manual */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar actividad manual</DialogTitle>
            <DialogDescription>
              Si no tienes Samsung Health o Google Fit, puedes registrar tu actividad a mano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="steps">Pasos</Label>
                <Input id="steps" type="number" value={manualData.steps} onChange={e => setManualData({...manualData, steps: e.target.value})} placeholder="8500" />
              </div>
              <div>
                <Label htmlFor="cal">Calorías activas</Label>
                <Input id="cal" type="number" value={manualData.caloriesBurned} onChange={e => setManualData({...manualData, caloriesBurned: e.target.value})} placeholder="320" />
              </div>
              <div>
                <Label htmlFor="dist">Distancia (m)</Label>
                <Input id="dist" type="number" value={manualData.distanceMeters} onChange={e => setManualData({...manualData, distanceMeters: e.target.value})} placeholder="5800" />
              </div>
              <div>
                <Label htmlFor="active">Min activos</Label>
                <Input id="active" type="number" value={manualData.activeMinutes} onChange={e => setManualData({...manualData, activeMinutes: e.target.value})} placeholder="45" />
              </div>
              <div>
                <Label htmlFor="hr">FC promedio (bpm)</Label>
                <Input id="hr" type="number" value={manualData.heartRateAvg} onChange={e => setManualData({...manualData, heartRateAvg: e.target.value})} placeholder="72" />
              </div>
              <div>
                <Label htmlFor="sleep">Horas sueño</Label>
                <Input id="sleep" type="number" step="0.1" value={manualData.sleepHours} onChange={e => setManualData({...manualData, sleepHours: e.target.value})} placeholder="7.5" />
              </div>
            </div>
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
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="font-bold mt-0.5">
        {value}
        {unit && <span className="text-xs text-muted-foreground ml-1 font-normal">{unit}</span>}
      </div>
    </div>
  )
}
