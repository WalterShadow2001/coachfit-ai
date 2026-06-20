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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Bell, Clock, RefreshCw, Loader2, Save, Cloud, CloudOff, Mic, Moon, Sun,
  User, Wallet, Watch, Smartphone, Heart, Activity, MapPin, Calendar,
  Sparkles, Dumbbell, AlertTriangle, Target, TrendingDown, ShoppingBag,
  CheckCircle2, Info
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
  const [editAge, setEditAge] = useState('')
  const [editHeight, setEditHeight] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editTargetWeight, setEditTargetWeight] = useState('')
  // Location
  const [location, setLocation] = useState<any>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  // Weight goal
  const [weightGoal, setWeightGoal] = useState<any>(null)
  const [editTargetWeeks, setEditTargetWeeks] = useState('')
  // Prices
  const [prices, setPrices] = useState<any>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  // Samsung Health modal
  const [healthModalOpen, setHealthModalOpen] = useState<'samsung' | 'google' | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, syncRes, healthRes, onboardingRes, locRes, wgRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/sync'),
        fetch('/api/health'),
        fetch('/api/onboarding'),
        fetch('/api/location'),
        fetch('/api/weight-goal'),
      ])
      const sJson = await sRes.json()
      const syncJson = await syncRes.json()
      const healthJson = await healthRes.json()
      const onbJson = await onboardingRes.json()
      const locJson = await locRes.json()
      const wgJson = await wgRes.json()
      if (sJson.settings) setSettings((prev: any) => ({ ...prev, ...sJson.settings }))
      setSyncInfo(syncJson)
      setHealthStatus(healthJson)
      if (onbJson.profile) {
        setProfile(onbJson.profile)
        setSchedules(onbJson.profile.schedules || [])
        setEditName(onbJson.profile.name || '')
        setEditAge(String(onbJson.profile.age || ''))
        setEditHeight(String(onbJson.profile.heightCm || ''))
        setEditBudget(String(onbJson.profile.budgetPerWeek || ''))
        setEditWeight(String(onbJson.profile.weightKg || ''))
        setEditTargetWeight(String(onbJson.profile.targetWeightKg || ''))
        setEditTargetWeeks(onbJson.profile.targetWeeks ? String(onbJson.profile.targetWeeks) : '')
      }
      setLocation(locJson)
      setWeightGoal(wgJson.analysis)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          name: editName,
          age: Number(editAge),
          heightCm: Number(editHeight),
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

  const detectLocation = async () => {
    setDetectingLocation(true)
    try {
      if (!navigator.geolocation) {
        toast.error('GPS no disponible en este dispositivo')
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          const res = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          toast.success(`Ubicación detectada: ${data.location.city}, ${data.location.state}`)
          await load()
        },
        (err) => {
          toast.error('Permiso de ubicación denegado: ' + err.message)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDetectingLocation(false)
    }
  }

  const saveWeightGoal = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/weight-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeeks: editTargetWeeks ? Number(editTargetWeeks) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Meta de peso guardada')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const loadPrices = async (refresh = false) => {
    setLoadingPrices(true)
    try {
      const res = await fetch(`/api/prices${refresh ? '?refresh=true' : ''}`)
      const data = await res.json()
      if (!res.ok) {
        if (data.needsLocation) {
          toast.error('Detecta tu ubicación primero')
        } else {
          toast.error(data.error)
        }
      } else {
        setPrices(data)
        if (refresh) toast.success(`Precios actualizados para ${data.city}`)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingPrices(false)
    }
  }

  const connectHealth = async (service: 'samsung_health' | 'google_fit') => {
    setHealthModalOpen(service)
  }

  const confirmHealthConnect = async () => {
    if (!healthModalOpen) return
    try {
      await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          steps: 0, caloriesBurned: 0, distanceMeters: 0, activeMinutes: 0,
          exercises: [], source: healthModalOpen,
        }),
      })
      toast.success(healthModalOpen === 'samsung_health' ? 'Samsung Health marcado como conectado' : 'Google Fit marcado como conectado')
      setHealthModalOpen(null)
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
              <Label htmlFor="age">Edad</Label>
              <Input id="age" type="number" value={editAge} onChange={e => setEditAge(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="height">Altura (cm)</Label>
              <Input id="height" type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={editWeight} onChange={e => setEditWeight(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="target">Meta peso (kg)</Label>
              <Input id="target" type="number" step="0.1" value={editTargetWeight} onChange={e => setEditTargetWeight(e.target.value)} />
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

      {/* === UBICACIÓN === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Ubicación</CardTitle>
          <CardDescription>Para calcular precios locales en supermercados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {location?.locationDetected ? (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {location.city}, {location.state}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                  </div>
                </div>
                <Badge className="bg-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Detectada
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground mb-3">
                Detecta tu ubicación para que la IA busque precios en Alsuper, Ahorrera, Soriana, etc. de tu ciudad
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={detectLocation} disabled={detectingLocation} className="flex-1">
              {detectingLocation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
              {location?.locationDetected ? 'Cambiar ubicación' : 'Detectar mi ubicación'}
            </Button>
            {location?.locationDetected && (
              <Button variant="outline" onClick={() => disconnectHealth('all')}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            ℹ️ Tu ubicación NO se comparte con nadie, solo se usa localmente para estimar precios
          </p>
        </CardContent>
      </Card>

      {/* === PRECIOS LOCALES === */}
      {location?.locationDetected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> Precios locales</CardTitle>
            <CardDescription>Estimaciones de la IA para {location.city}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!prices ? (
              <Button onClick={() => loadPrices(false)} disabled={loadingPrices} className="w-full">
                {loadingPrices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Consultar precios con IA
              </Button>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{prices.totalProducts} productos · {prices.city}</span>
                  <Button size="sm" variant="ghost" onClick={() => loadPrices(true)} disabled={loadingPrices}>
                    {loadingPrices ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    Actualizar
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {Object.entries(prices.prices).map(([category, items]: [string, any]) => (
                    <div key={category}>
                      <div className="font-semibold text-sm mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" /> {category}
                      </div>
                      <div className="space-y-1">
                        {items.slice(0, 5).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                            <div>
                              <div className="font-medium">{p.productName}</div>
                              <div className="text-muted-foreground">{p.store} · conf.{(p.confidence * 100).toFixed(0)}%</div>
                            </div>
                            <div className="font-bold">${p.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  💡 Estos precios son estimaciones de la IA. Verifica en tu tienda local.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* === META DE PESO === */}
      {weightGoal && (
        <Card className={weightGoal.isDangerous ? 'border-destructive' : weightGoal.isAggressive ? 'border-amber-500' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Meta de peso
            </CardTitle>
            <CardDescription>
              {profile?.goal === 'lose' ? 'Bajar' : profile?.goal === 'gain' ? 'Subir' : 'Mantener'}:
              {' '}{Math.abs(weightGoal.weightDiff)} kg en {weightGoal.effectiveWeeks} semanas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Calorías objetivo/día</div>
                <div className="font-bold text-lg">{weightGoal.targetCalories}</div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">
                  {profile?.goal === 'lose' ? 'Déficit' : 'Superávit'} calórico
                </div>
                <div className="font-bold text-lg">{weightGoal.dailyKcalChange} kcal</div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Ritmo semanal</div>
                <div className="font-bold text-lg">{weightGoal.weeklyRate} kg/sem</div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Máximo seguro</div>
                <div className="font-bold text-lg">{weightGoal.maxWeeklyLoss} kg/sem</div>
              </div>
            </div>

            {/* Advertencias */}
            {weightGoal.warnings.length > 0 && (
              <div className={`p-3 rounded-lg space-y-1 ${
                weightGoal.isDangerous ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}>
                {weightGoal.warnings.map((w: string, i: number) => (
                  <div key={i} className="text-xs flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recomendaciones */}
            {weightGoal.recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-1">
                {weightGoal.recommendations.map((r: string, i: number) => (
                  <div key={i} className="text-xs flex items-start gap-1 text-blue-700 dark:text-blue-300">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recomendación de ejercicio */}
            {weightGoal.exerciseRecommendation && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" /> Ejercicio necesario
                </div>
                <div className="text-xs">{weightGoal.exerciseRecommendation}</div>
              </div>
            )}

            {/* Editor de meta */}
            <Separator />
            <div>
              <Label htmlFor="weeks">¿En cuántas semanas quieres llegar a tu meta?</Label>
              <div className="flex gap-2">
                <Input
                  id="weeks"
                  type="number"
                  value={editTargetWeeks}
                  onChange={e => setEditTargetWeeks(e.target.value)}
                  placeholder={String(weightGoal.minWeeksSafe)}
                />
                <Button onClick={saveWeightGoal} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo seguro: {weightGoal.minWeeksSafe} semanas · Máximo recomendado: 1% peso/sem
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
              {prices ? (
                <>
                  Con tu ubicación ({prices.city}), la IA ajusta el plan a precios de Alsuper, Ahorrera, Soriana, etc.
                </>
              ) : (
                <>Detecta tu ubicación para que la IA use precios reales de tu ciudad</>
              )}
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

      {/* === MODAL: Qué hacer para conectar Samsung Health / Google Fit === */}
      <Dialog open={!!healthModalOpen} onOpenChange={(v) => !v && setHealthModalOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {healthModalOpen === 'samsung_health' ? (
                <><Watch className="w-5 h-5 text-blue-500" /> Conectar Samsung Health</>
              ) : (
                <><Smartphone className="w-5 h-5 text-emerald-500" /> Conectar Google Fit</>
              )}
            </DialogTitle>
            <DialogDescription>
              Cómo funciona la conexión con tu app de salud
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
              <strong>⚠️ Importante:</strong> Esta es una versión web/PWA. La conexión real con Samsung Health / Google Fit solo funciona en la <strong>versión APK nativa</strong> de la app (usando Health Connect de Android 14+).
            </div>

            <div className="space-y-2">
              <div className="font-medium">📱 En la versión APK (cuándo la instales en tu celular):</div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Al tocar "Conectar", se abre Health Connect (Android 14+)</li>
                <li>Das permiso a CoachFit AI para leer: pasos, calorías, ritmo cardíaco, sueño, ejercicios</li>
                <li>La app lee automáticamente cada hora tus datos</li>
                <li>Aparecen en el Dashboard sin que hagas nada</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="font-medium">🌐 En la versión web/PWA (ahora):</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Puedes registrar datos manualmente</li>
                <li>La app está lista para cuando la instales como APK</li>
                <li>Marcamos como "conectado" para que puedas probar las funciones</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-medium">⚙️ Cómo convertir a APK:</div>
              <p className="text-xs text-muted-foreground">
                Clona el repo, instala Capacitor con Health Connect, compila con Android Studio.
                Las instrucciones completas están en el README de GitHub.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setHealthModalOpen(null)}>Cancelar</Button>
            <Button onClick={confirmHealthConnect}>
              Entendido, marcar como conectado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
