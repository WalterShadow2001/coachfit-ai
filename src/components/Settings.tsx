'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Clock, RefreshCw, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [settings, setSettings] = useState<any>({
    notificationsEnabled: true,
    snoozeMinutes: 15,
    maxRetries: 5,
    retryIntervalMin: 10,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()
      if (json.settings) setSettings(json.settings)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
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

  if (loading) {
    return <div className="p-4"><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5 text-emerald-500" /> Notificaciones</CardTitle>
          <CardDescription>Configura cómo y cuándo te molesta tu coach</CardDescription>
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
              <p className="text-xs text-muted-foreground mt-1">Cuando dices "más tarde", te vuelvo a molestar en X minutos</p>
            </div>
            <div>
              <Label htmlFor="retries">Máximo intentos</Label>
              <Input id="retries" type="number" value={settings.maxRetries} onChange={e => setSettings((s: any) => ({ ...s, maxRetries: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground mt-1">Después de esto me rindo</p>
            </div>
          </div>

          <div>
            <Label htmlFor="retry">Intervalo entre intentos (min)</Label>
            <Input id="retry" type="number" value={settings.retryIntervalMin} onChange={e => setSettings((s: any) => ({ ...s, retryIntervalMin: Number(e.target.value) }))} />
            <p className="text-xs text-muted-foreground mt-1">Si no respondes, te recuerdo cada X minutos</p>
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
          <p className="text-xs text-muted-foreground">En estas horas no te molesto (generalmente de noche)</p>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
            <Button variant="outline" onClick={reschedule} disabled={rescheduling}>
              {rescheduling ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Reprogramar hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Solo te notifico en horas libres (despierto, no en trabajo, fuera de horas silenciosas).</p>
          <p>• A la hora de comer te recuerdo qué comer según tu plan.</p>
          <p>• Después del trabajo te recuerdo hacer ejercicio.</p>
          <p>• Si dices "Sí" → registro lo que hiciste.</p>
          <p>• Si dices "Más tarde" → te vuelvo a molestar en {settings.snoozeMinutes} min.</p>
          <p>• Si dices "Omitir" → me callo hasta el siguiente recordatorio.</p>
          <p>• Si ignoras la notificación → te recuerdo cada {settings.retryIntervalMin} min, hasta {settings.maxRetries} veces.</p>
          <p>• Al final del día genero un feedback con IA comparando tu plan vs lo real.</p>
        </CardContent>
      </Card>
    </div>
  )
}
