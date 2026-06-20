'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Apple, Dumbbell, Check, X, Mic, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import VoiceRecorder from './VoiceRecorder'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
]

const INTENSITY = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

export default function Logger() {
  const [tab, setTab] = useState<string>('meal')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Meal form
  const [mealType, setMealType] = useState('lunch')
  const [mealName, setMealName] = useState('')
  const [mealCalories, setMealCalories] = useState('')
  const [mealNotes, setMealNotes] = useState('')
  const [mealOnPlan, setMealOnPlan] = useState<boolean | null>(null)

  // Exercise form
  const [exName, setExName] = useState('')
  const [exDuration, setExDuration] = useState('')
  const [exIntensity, setExIntensity] = useState('medium')
  const [exCalories, setExCalories] = useState('')
  const [exNotes, setExNotes] = useState('')
  const [exOnPlan, setExOnPlan] = useState<boolean | null>(null)

  // IA parsing states
  const [mealAiParsing, setMealAiParsing] = useState(false)
  const [exAiParsing, setExAiParsing] = useState(false)

  // Logs del día
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([])

  const today = new Date().toISOString().slice(0, 10)

  const parseVoiceWithAI = async (text: string, context: 'meal' | 'exercise') => {
    const setter = context === 'meal' ? setMealAiParsing : setExAiParsing
    setter(true)
    try {
      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.parsed) {
        if (context === 'meal') {
          if (data.parsed.name) setMealName(data.parsed.name)
          if (data.parsed.calories) setMealCalories(String(data.parsed.calories))
          if (data.parsed.onPlan !== undefined && data.parsed.onPlan !== null) setMealOnPlan(data.parsed.onPlan)
          if (data.parsed.notes) setMealNotes(data.parsed.notes)
        } else {
          if (data.parsed.name) setExName(data.parsed.name)
          if (data.parsed.calories) setExCalories(String(data.parsed.calories))
          if (data.parsed.duration) setExDuration(String(data.parsed.duration))
          if (data.parsed.intensity) setExIntensity(data.parsed.intensity)
          if (data.parsed.onPlan !== undefined && data.parsed.onPlan !== null) setExOnPlan(data.parsed.onPlan)
          if (data.parsed.notes) setExNotes(data.parsed.notes)
        }
        toast.success('IA interpretó tu respuesta ✓')
      } else {
        if (context === 'meal') setMealName(text)
        else setExName(text)
        toast.info('No pude interpretar todo, revisa los campos')
      }
    } catch (e: any) {
      console.error('AI parse error:', e)
      if (context === 'meal') setMealName(text)
      else setExName(text)
      toast.error('No pude interpretar, puse el texto tal cual')
    } finally {
      setter(false)
    }
  }

  const handleMealVoice = (text: string) => {
    setMealNotes(prev => prev ? prev + ' ' + text : text)
    parseVoiceWithAI(text, 'meal')
  }
  const handleExVoice = (text: string) => {
    setExNotes(prev => prev ? prev + ' ' + text : text)
    parseVoiceWithAI(text, 'exercise')
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const [m, e] = await Promise.all([
        fetch(`/api/log/meal?date=${today}`).then(r => r.json()),
        fetch(`/api/log/exercise?date=${today}`).then(r => r.json()),
      ])
      setMealLogs(m.logs || [])
      setExerciseLogs(e.logs || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [])

  const submitMeal = async () => {
    if (!mealName.trim()) {
      toast.error('Escribe qué comiste')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/log/meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mealType,
          actualName: mealName,
          calories: mealCalories ? Number(mealCalories) : null,
          notes: mealNotes,
          onPlan: mealOnPlan,
        }),
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Comida registrada')
      setMealName(''); setMealCalories(''); setMealNotes(''); setMealOnPlan(null)
      await loadLogs()
    } catch {
      toast.error('No se pudo registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const submitExercise = async () => {
    if (!exName.trim()) {
      toast.error('Escribe qué ejercicio hiciste')
      return
    }
    if (!exDuration || Number(exDuration) <= 0) {
      toast.error('Cuántos minutos?')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/log/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualName: exName,
          durationMin: Number(exDuration),
          intensity: exIntensity,
          caloriesBurn: exCalories ? Number(exCalories) : null,
          notes: exNotes,
          onPlan: exOnPlan,
        }),
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Ejercicio registrado')
      setExName(''); setExDuration(''); setExCalories(''); setExNotes(''); setExOnPlan(null)
      await loadLogs()
    } catch {
      toast.error('No se pudo registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMeal = async (id: string) => {
    await fetch(`/api/log/meal?id=${id}`, { method: 'DELETE' })
    loadLogs()
  }
  const deleteExercise = async (id: string) => {
    await fetch(`/api/log/exercise?id=${id}`, { method: 'DELETE' })
    loadLogs()
  }

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Registrar</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="meal"><Apple className="w-4 h-4 mr-1" /> Comida</TabsTrigger>
          <TabsTrigger value="exercise"><Dumbbell className="w-4 h-4 mr-1" /> Ejercicio</TabsTrigger>
        </TabsList>

        {/* === MEAL FORM === */}
        <TabsContent value="meal" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Agregar comida</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {mealAiParsing ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    IA interpretando tu voz...
                  </span>
                </div>
              ) : (
                <VoiceRecorder onTranscribed={handleMealVoice} buttonText="Hablar para registrar" />
              )}
              <div>
                <Label>Tipo</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mn">¿Qué comiste?</Label>
                <Input id="mn" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Ej. Pollo con arroz y ensalada" />
              </div>
              <div>
                <Label htmlFor="mc">Calorías (opcional)</Label>
                <Input id="mc" type="number" value={mealCalories} onChange={e => setMealCalories(e.target.value)} placeholder="450" />
              </div>
              <div>
                <Label>¿Cumplió el plan?</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={mealOnPlan === true ? 'default' : 'outline'}
                    className={mealOnPlan === true ? 'bg-emerald-600' : ''}
                    onClick={() => setMealOnPlan(true)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Sí, seguí el plan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mealOnPlan === false ? 'default' : 'outline'}
                    className={mealOnPlan === false ? 'bg-rose-600' : ''}
                    onClick={() => setMealOnPlan(false)}
                  >
                    <X className="w-4 h-4 mr-1" /> No
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="mnotes">Notas</Label>
                <Textarea id="mnotes" value={mealNotes} onChange={e => setMealNotes(e.target.value)} placeholder="Porciones, cómo te sentiste..." rows={2} />
              </div>
              <Button className="w-full" onClick={submitMeal} disabled={submitting}>
                <Plus className="w-4 h-4 mr-1" /> Registrar comida
              </Button>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">REGISTRADO HOY</h2>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : mealLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nada registrado todavía</p>
            ) : (
              <div className="space-y-2">
                {mealLogs.map(m => (
                  <Card key={m.id}>
                    <CardContent className="p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {MEAL_TYPES.find(t => t.value === m.type)?.label || m.type}
                          </Badge>
                          {m.onPlan === true && <Badge className="bg-emerald-600 text-xs">En plan</Badge>}
                          {m.onPlan === false && <Badge variant="destructive" className="text-xs">Fuera de plan</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.loggedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-medium text-sm mt-1">{m.actualName}</div>
                        {m.calories && <div className="text-xs text-muted-foreground">{m.calories} kcal</div>}
                        {m.notes && <div className="text-xs text-muted-foreground italic mt-1">{m.notes}</div>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMeal(m.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* === EXERCISE FORM === */}
        <TabsContent value="exercise" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Agregar ejercicio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {exAiParsing ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    IA interpretando tu voz...
                  </span>
                </div>
              ) : (
                <VoiceRecorder onTranscribed={handleExVoice} buttonText="Hablar para registrar" />
              )}
              <div>
                <Label htmlFor="en">¿Qué ejercicio hiciste?</Label>
                <Input id="en" value={exName} onChange={e => setExName(e.target.value)} placeholder="Ej. 30 min running, pesas..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ed">Duración (min)</Label>
                  <Input id="ed" type="number" value={exDuration} onChange={e => setExDuration(e.target.value)} placeholder="45" />
                </div>
                <div>
                  <Label>Intensidad</Label>
                  <Select value={exIntensity} onValueChange={setExIntensity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTENSITY.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="ec">Calorías quemadas (opcional)</Label>
                <Input id="ec" type="number" value={exCalories} onChange={e => setExCalories(e.target.value)} placeholder="300" />
              </div>
              <div>
                <Label>¿Cumplió el plan?</Label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" size="sm" variant={exOnPlan === true ? 'default' : 'outline'} className={exOnPlan === true ? 'bg-emerald-600' : ''} onClick={() => setExOnPlan(true)}>
                    <Check className="w-4 h-4 mr-1" /> Sí, lo planeado
                  </Button>
                  <Button type="button" size="sm" variant={exOnPlan === false ? 'default' : 'outline'} className={exOnPlan === false ? 'bg-rose-600' : ''} onClick={() => setExOnPlan(false)}>
                    <X className="w-4 h-4 mr-1" /> Algo diferente
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="enotes">Notas</Label>
                <Textarea id="enotes" value={exNotes} onChange={e => setExNotes(e.target.value)} placeholder="Cómo te sentiste, dificultad..." rows={2} />
              </div>
              <Button className="w-full" onClick={submitExercise} disabled={submitting}>
                <Plus className="w-4 h-4 mr-1" /> Registrar ejercicio
              </Button>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">REGISTRADO HOY</h2>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : exerciseLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nada registrado todavía</p>
            ) : (
              <div className="space-y-2">
                {exerciseLogs.map(e => (
                  <Card key={e.id}>
                    <CardContent className="p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{e.durationMin} min</Badge>
                          {e.intensity && <Badge variant="outline" className="text-xs">{e.intensity}</Badge>}
                          {e.onPlan === true && <Badge className="bg-emerald-600 text-xs">En plan</Badge>}
                          {e.onPlan === false && <Badge variant="destructive" className="text-xs">Fuera de plan</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.loggedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-medium text-sm mt-1">{e.actualName}</div>
                        {e.caloriesBurn && <div className="text-xs text-muted-foreground">{e.caloriesBurn} kcal</div>}
                        {e.notes && <div className="text-xs text-muted-foreground italic mt-1">{e.notes}</div>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteExercise(e.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
