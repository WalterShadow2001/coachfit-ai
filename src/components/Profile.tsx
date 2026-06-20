'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell, Clock, RefreshCw, Loader2, Save, Cloud, CloudOff, Mic, Moon, Sun,
  User, Wallet, Watch, Smartphone, Heart, Activity, MapPin, Calendar,
  Sparkles, Dumbbell
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

export default function Profile() {
  const { theme, setTheme } = useTheme()
  const setHasProfile = useAppStore(s => s.setHasProfile)
  const setView = useAppStore(s => s.setView)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [adapting, setAdapting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({
    notificationsEnabled: true,
    snoozeMinutes: 15,
    maxRetries: 5,
    retryIntervalMin: 10,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    cloudSyncEnabled: false,
  })
  const [syncInfo, setSyncInfo] = useState<any>(null)
  const [healthStatus, setHealthStatus] = useState<any>(null)
  // Editable fields
  const [editName, setEditName] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editTargetWeight, setEditTargetWeight] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, syncRes, healthRes, onboardingRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/sync'),
        fetch('/api/health'),
        fetch('/api/onboarding'),
      ])
      const sJson = await sRes.json()
      const syncJson = await syncRes.json()
      const healthJson = await healthRes.json()
      const onbJson = await onboardingRes.json()
      if (sJson.settings) setSettings((prev: any) => ({ ...prev, ...sJson.settings }))
      setSyncInfo(syncJson)
      setHealthStatus(healthJson)
      if (onbJson.profile) {
        setProfile(onbJson.profile)
        setSchedules(onbJson.profile.schedules || [])
        setEditName(onbJson.profile.name || '')
        setEditBudget(String(onbJson.profile.budgetPerWeek || ''))
        setEditWeight(String(onbJson.profile.weightKg || ''))
        setEditTargetWeight(String(onbJson.profile.targetWeightKg || ''))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      // Actualizar perfil manteniendo schedules existentes
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          name: editName,
          budgetPerWeek: Number(editBudget),
          weightKg: Number(editWeight),
          targetWeightKg: Number(editTargetWeight),
          schedules: schedules.map((s: any) => ({
            label: s.label,
            days: typeof s.days === 'string' ? JSON.parse(s.days) : s.days,
            workStart: s.workStart,
            workEnd: s.workEnd,
            lunchStart: s.lunchStart,
            lunchEnd: s.lunchEnd,
            isFreeDay: s.isFreeDay,
            notes: s.notes,
          })),
        }),
      })
      toast.success('Perfil actualizado')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      toast.success('Ajustes guardados')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const reschedule = async () => {
    setRescheduling(true)
    try {
      await fetch('/api/schedule', { method: 'POST' })
      toast.success('Notificaciones reprogramadas')
    } catch {
      toast.error('Error')
    } finally {
      setRescheduling(false)
    }
  }

  const toggleCloudSync = async (enable: boolean) => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(enable ? 'Sincronización con nube activada' : 'Modo local únicamente')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sincronizado: ${data.synced?.total || 0} registros`)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const adaptPlan = async () => {
    setAdapting(true)
    try {
      const res = await fetch('/api/ai-adapt', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Plan de ejercicio ajustado por IA')
      // Mostrar detalles del ajuste
      if (data.changes && data.changes.length > 0) {
        setTimeout(() => {
          toast(data.changes.join('\n'), { duration: 8000 })
        }, 1000)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAdapting(false)
    }
  }

  const connectHealth = async (service: 'samsung_health' | 'google_fit') => {
    try {
      await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          steps: 0, caloriesBurned: 0, distanceMeters: 0, activeMinutes: 0,
          exercises: [], source: service,
        }),
      })
      toast.success(service === 'samsung_health' ? 'Samsung Health conectado' : 'Google Fit conectado')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const disconnectHealth = async (service: 'samsung_health' | 'google_fit' | 'all') => {
    try {
      await fetch(`/api/health?source=${service}`, { method: 'DELETE' })
      toast.success('Desconectado')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return <div className="p-4"><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Perfil</h1>

      {/* === INFORMACIÓN PERSONAL === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Información personal</CardTitle>
          <CardDescription>Tus datos básicos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="weight">Peso actual (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={editWeight} onChange={e => setEditWeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="target">Meta peso (kg)</Label>
              <Input id="target" type="number" step="0.1" value={editTargetWeight} onChange={e => setEditTargetWeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="age">Edad</Label>
              <Input id="age" type="number" value={profile?.age || ''} disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Altura (cm)</Label>
              <Input value={profile?.heightCm || ''} disabled />
            </div>
            <div>
              <Label>Objetivo</Label>
              <Input
                value={profile?.goal === 'lose' ? 'Bajar de peso' : profile?.goal === 'gain' ? 'Ganar masa muscular' : 'Mantener'}
                disabled
              />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* === PRESUPUESTO === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Presupuesto</CardTitle>
          <CardDescription>Cuánto puedes gastar en comida por semana (MXN)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="budget">Presupuesto semanal</Label>
            <div className="flex gap-2">
              <Input id="budget" type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} />
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Si cambias esto, la próxima vez que regeneres el plan de comidas se ajustará al nuevo presupuesto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === APARIENCIA === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            Apariencia
          </CardTitle>
          <CardDescription>Personaliza cómo se ve la app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Modo oscuro
              </div>
              <div className="text-xs text-muted-foreground">Cambia entre tema claro y oscuro</div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={v => setTheme(v ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* === CONEXIONES DE SALUD === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Conexiones de salud</CardTitle>
          <CardDescription>Conecta tus apps y dispositivos de salud</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Samsung Health */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Watch className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Samsung Health</div>
                <div className="text-xs text-muted-foreground">
                  {healthStatus?.connected?.samsungHealth
                    ? `Conectado · ${healthStatus.lastSync?.samsungHealth ? new Date(healthStatus.lastSync.samsungHealth).toLocaleDateString() : ''}`
                    : 'No conectado'}
                </div>
              </div>
            </div>
            {healthStatus?.connected?.samsungHealth ? (
              <Button size="sm" variant="ghost" onClick={() => disconnectHealth('samsung_health')} className="text-destructive">
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={() => connectHealth('samsung_health')}>Conectar</Button>
            )}
          </div>

          {/* Google Fit */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Google Fit</div>
                <div className="text-xs text-muted-foreground">
                  {healthStatus?.connected?.googleFit
                    ? `Conectado · ${healthStatus.lastSync?.googleFit ? new Date(healthStatus.lastSync.googleFit).toLocaleDateString() : ''}`
                    : 'No conectado'}
                </div>
              </div>
            </div>
            {healthStatus?.connected?.googleFit ? (
              <Button size="sm" variant="ghost" onClick={() => disconnectHealth('google_fit')} className="text-destructive">
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={() => connectHealth('google_fit')}>Conectar</Button>
            )}
          </div>

          {/* Estado ritmo cardíaco */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Ritmo cardíaco en vivo</div>
                <div className="text-xs text-muted-foreground">
                  {healthStatus?.heartRate ? `${healthStatus.heartRate.bpm} bpm · ${new Date(healthStatus.heartRate.timestamp).toLocaleTimeString()}` : 'Sin datos recientes'}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ℹ️ En la versión APK, esto conecta automáticamente con Health Connect (Android 14+) y lee datos nativos del reloj Samsung
          </p>
        </CardContent>
      </Card>

      {/* === NOTIFICACIONES === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notificaciones</CardTitle>
          <CardDescription>Cómo y cuándo te molesta tu coach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Notificaciones activadas</div>
              <div className="text-xs text-muted-foreground">Si apagas, no recibirás recordatorios</div>
            </div>
            <Switch checked={settings.notificationsEnabled} onCheckedChange={v => setSettings((s: any) => ({ ...s, notificationsEnabled: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="snooze">Minutos de "más tarde"</Label>
              <Input id="snooze" type="number" value={settings.snoozeMinutes} onChange={e => setSettings((s: any) => ({ ...s, snoozeMinutes: Number(e.target.value) }))} />
            </div>
            <div>
              <Label htmlFor="retries">Máximo intentos</Label>
              <Input id="retries" type="number" value={settings.maxRetries} onChange={e => setSettings((s: any) => ({ ...s, maxRetries: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="retry">Intervalo entre intentos (min)</Label>
            <Input id="retry" type="number" value={settings.retryIntervalMin} onChange={e => setSettings((s: any) => ({ ...s, retryIntervalMin: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qs">Inicio horas silenciosas</Label>
              <Input id="qs" type="time" value={settings.quietHoursStart} onChange={e => setSettings((s: any) => ({ ...s, quietHoursStart: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="qe">Fin horas silenciosas</Label>
              <Input id="qe" type="time" value={settings.quietHoursEnd} onChange={e => setSettings((s: any) => ({ ...s, quietHoursEnd: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Guardar
            </Button>
            <Button variant="outline" onClick={reschedule} disabled={rescheduling}>
              {rescheduling ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Reprogramar hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === IA ADAPTATIVA === */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> IA Adaptativa</CardTitle>
          <CardDescription>Si no estás cumpliendo, la IA ajusta solo el ejercicio (sin tocar tu dieta)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <div className="font-medium">¿Cómo funciona?</div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Analiza tu adherencia de los últimos 7 días</li>
              <li>Si no quemaste suficientes calorías → aumenta intensidad</li>
              <li>Si fallaste muchos días → simplifica rutina (más corta)</li>
              <li>NUNCA cambia tu plan de comidas (respeta presupuesto)</li>
            </ul>
          </div>
          <Button onClick={adaptPlan} disabled={adapting} className="w-full bg-primary">
            {adapting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando cumplimiento...</> : <><Dumbbell className="w-4 h-4 mr-2" /> Ajustar plan de ejercicio con IA</>}
          </Button>
        </CardContent>
      </Card>

      {/* === SINCRONIZACIÓN NUBE === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {settings.cloudSyncEnabled ? <Cloud className="w-5 h-5 text-primary" /> : <CloudOff className="w-5 h-5 text-muted-foreground" />}
            Sincronización con la nube
          </CardTitle>
          <CardDescription>Datos locales en tu dispositivo + respaldo en Turso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Activar sync con Turso</div>
              <div className="text-xs text-muted-foreground">Respaldo + acceso multi-dispositivo</div>
            </div>
            <Switch
              checked={settings.cloudSyncEnabled}
              onCheckedChange={toggleCloudSync}
              disabled={syncing}
            />
          </div>

          {syncInfo && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modo actual:</span>
                <Badge variant={syncInfo.mode === 'cloud' ? 'default' : 'secondary'}>
                  {syncInfo.mode === 'cloud' ? '☁️ Nube' : '📱 Local'}
                </Badge>
              </div>
              {syncInfo.lastSyncAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última sync:</span>
                  <span>{new Date(syncInfo.lastSyncAt).toLocaleString('es-MX')}</span>
                </div>
              )}
              {syncInfo.pending?.total > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pendientes:</span>
                  <span className="text-amber-600">{syncInfo.pending.total} registros</span>
                </div>
              )}
            </div>
          )}

          {settings.cloudSyncEnabled && (
            <Button onClick={syncNow} disabled={syncing} variant="outline" className="w-full">
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar ahora
            </Button>
          )}
        </CardContent>
      </Card>

      {/* === VOZ === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mic className="w-5 h-5 text-primary" /> Voz a texto con IA</CardTitle>
          <CardDescription>Responde a notificaciones hablando</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>🎤 Toca "Responder con voz" en cualquier notificación</p>
          <p>🧠 La IA transcribe tu audio y extrae: qué comiste/hiciste, calorías, intensidad, si cumpliste el plan</p>
          <p>⚡ Más rápido que escribir, ideal cuando estás comiendo o entrenando</p>
          <p className="pt-2 border-t">
            <strong>Permisos necesarios:</strong> Micrófono (se pide al usar por primera vez)
          </p>
        </CardContent>
      </Card>

      {/* === HORARIOS === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Horarios ({schedules.length})</CardTitle>
          <CardDescription>Tus bloques de horario configurados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedules.map((s: any) => {
            const days = typeof s.days === 'string' ? JSON.parse(s.days) : s.days
            return (
              <div key={s.id} className="p-2 bg-muted rounded-lg text-sm">
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">
                  {s.isFreeDay ? '🎉 Día libre' : `💼 ${s.workStart} - ${s.workEnd}`} · 🍽️ {s.lunchStart} - {s.lunchEnd}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Días: {days.join(', ')}
                </div>
                {s.notes && <div className="text-xs italic mt-1">"{s.notes}"</div>}
              </div>
            )
          })}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              setHasProfile(false)
              setView('onboarding')
            }}
          >
            Re-configurar todo (incluyendo horarios)
          </Button>
        </CardContent>
      </Card>

      {/* === CÓMO FUNCIONA === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Solo te notifico en horas libres (despierto, no en trabajo, fuera de horas silenciosas)</p>
          <p>• A la hora de comer te recuerdo qué comer según tu plan</p>
          <p>• Después del trabajo te recuerdo hacer ejercicio</p>
          <p>• Si dices "Ya lo hice" → registro lo que hiciste (texto o voz)</p>
          <p>• Si dices "Más tarde" → te vuelvo a molestar en {settings.snoozeMinutes} min</p>
          <p>• No hay opción de omitir: se hace o se hace. Pero puedes posponer</p>
          <p>• Si ignoras la notificación → te recuerdo cada {settings.retryIntervalMin} min, hasta {settings.maxRetries} veces</p>
          <p>• Al final del día genero un feedback con IA comparando tu plan vs lo real</p>
          <p>• Si no cumples varios días → la IA ajusta solo el ejercicio (no la dieta)</p>
        </CardContent>
      </Card>
    </div>
  )
}
