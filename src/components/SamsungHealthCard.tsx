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
  Watch, RefreshCw, Loader2, X, Sparkles
} from 'lucide-react'
import { useHealthConnect, submitManualHealthData } from '@/hooks/use-health-connect'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function SamsungHealthCard() {
  const {
    connected, lastSync, todayData, weekData, loading, error,
    requestPermission, syncFromDevice, disconnect, refresh,
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

  const handleConnect = async () => {
    const ok = await requestPermission()
    if (ok) toast.success('Samsung Health conectado')
  }

  const handleSync = async () => {
    const data = await syncFromDevice()
    if (data) {
      toast.success(`Sincronizado: ${data.steps} pasos`)
      await refresh()
    } else if (error) {
      // Mostrar dialog para entrada manual
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

  if (loading && !todayData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Watch className="w-5 h-5 text-primary" /> Samsung Health
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
                <Watch className="w-5 h-5 text-primary" /> Samsung Health
              </CardTitle>
              <CardDescription className="text-xs">
                {connected
                  ? `Conectado · Última sync: ${lastSync ? lastSync.toLocaleString('es-MX') : '-'}`
                  : 'Conecta tu reloj Samsung para ver actividad automáticamente'}
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
                Conecta Samsung Health / Health Connect para registrar automáticamente pasos, calorías, ritmo cardíaco y ejercicios.
              </p>
              <div className="space-y-2">
                <Button onClick={handleConnect} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Watch className="w-4 h-4 mr-2" />}
                  Conectar Samsung Health
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)} className="w-full text-xs" size="sm">
                  <Plus className="w-3 h-3 mr-1" /> Registrar datos manualmente
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ℹ️ En la versión APK, esto conecta automáticamente con Samsung Health vía Health Connect (Android 14+)
              </p>
            </div>
          ) : (
            <>
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
                <Button size="sm" variant="outline" onClick={handleSync} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Sincronizar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setManualOpen(true)} className="flex-1">
                  <Plus className="w-3 h-3 mr-1" /> Manual
                </Button>
                <Button size="sm" variant="ghost" onClick={disconnect} className="text-destructive">
                  <X className="w-3 h-3" />
                </Button>
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
              Si no tienes Samsung Health conectado, puedes registrar tu actividad a mano.
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
