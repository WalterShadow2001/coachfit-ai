'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { Loader2, ChevronLeft, ChevronRight, Dumbbell, Salad, Wallet, Clock, Heart } from 'lucide-react'

const DAYS = [
  { id: 'mon', label: 'Lun' },
  { id: 'tue', label: 'Mar' },
  { id: 'wed', label: 'Mié' },
  { id: 'thu', label: 'Jue' },
  { id: 'fri', label: 'Vie' },
  { id: 'sat', label: 'Sáb' },
  { id: 'sun', label: 'Dom' },
]

const DIETARY = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Bajo en carbohidratos', 'Cetogénico', 'Sin cerdo', 'Sin mariscos']
const EQUIPMENT = ['Mancuernas', 'Bandas de resistencia', 'Barra de dominadas', 'Banco', 'Pelota de yoga', 'Sin equipo (peso corporal)']

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setHasProfile = useAppStore(s => s.setHasProfile)
  const setView = useAppStore(s => s.setView)

  const [data, setData] = useState<any>({
    name: '',
    age: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    activityLevel: 'sedentary',
    budgetPerWeek: '1500',
    workStart: '09:00',
    workEnd: '18:00',
    workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    lunchStart: '14:00',
    lunchEnd: '15:00',
    wakeTime: '07:00',
    sleepTime: '23:00',
    restrictions: [],
    allergies: [],
    dislikedFoods: [],
    equipment: ['Sin equipo (peso corporal)'],
    goal: 'lose',
    allergyInput: '',
    dislikeInput: '',
  })

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))

  const toggleArr = (k: string, v: string) => {
    setData((d: any) => {
      const arr = d[k] || []
      return { ...d, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] }
    })
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      // Programa notificaciones del día
      await fetch('/api/schedule', { method: 'POST' })
      setHasProfile(true)
      setView('dashboard')
      onDone()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const next = () => { setError(''); setStep(s => Math.min(5, s + 1)) }
  const prev = () => { setError(''); setStep(s => Math.max(1, s - 1)) }

  const canNext = () => {
    if (step === 1) return data.name && data.age && data.heightCm && data.weightKg && data.targetWeightKg
    if (step === 2) return data.goal && data.activityLevel && data.budgetPerWeek
    if (step === 3) return data.workStart && data.workEnd && data.lunchStart && data.lunchEnd && data.wakeTime && data.sleepTime && data.workDays.length > 0
    if (step === 4) return true // restrictions opcional
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-lg">CoachFit AI</span>
          </div>
          <Progress value={(step / 5) * 100} className="h-2 mb-2" />
          <CardTitle className="text-2xl">
            {step === 1 && 'Tu información básica'}
            {step === 2 && 'Tu objetivo y presupuesto'}
            {step === 3 && 'Tu horario de trabajo'}
            {step === 4 && 'Preferencias alimenticias'}
            {step === 5 && 'Equipo disponible'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Necesito estos datos para calcular tus calorías diarias'}
            {step === 2 && 'Esto me ayuda a crear un plan realista que puedas cumplir'}
            {step === 3 && 'Solo te molestaré en tus horas libres y a la hora de comer'}
            {step === 4 && 'Para no recomendarte algo que no puedes o no quieres comer'}
            {step === 5 && 'Para diseñar una rutina de ejercicio que puedas hacer'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 min-h-[280px]">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={data.name} onChange={e => set('name', e.target.value)} placeholder="Ej. Carlos" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="age">Edad</Label>
                  <Input id="age" type="number" value={data.age} onChange={e => set('age', e.target.value)} placeholder="30" />
                </div>
                <div>
                  <Label>Género</Label>
                  <Select value={data.gender} onValueChange={v => set('gender', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Hombre</SelectItem>
                      <SelectItem value="female">Mujer</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="h">Altura (cm)</Label>
                  <Input id="h" type="number" value={data.heightCm} onChange={e => set('heightCm', e.target.value)} placeholder="175" />
                </div>
                <div>
                  <Label htmlFor="w">Peso (kg)</Label>
                  <Input id="w" type="number" value={data.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="80" />
                </div>
                <div>
                  <Label htmlFor="tw">Meta (kg)</Label>
                  <Input id="tw" type="number" value={data.targetWeightKg} onChange={e => set('targetWeightKg', e.target.value)} placeholder="72" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Objetivo</Label>
                <RadioGroup value={data.goal} onValueChange={v => set('goal', v)} className="grid grid-cols-1 gap-2 mt-2">
                  <Label htmlFor="lose" className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950">
                    <RadioGroupItem value="lose" id="lose" className="mt-1" />
                    <div>
                      <div className="font-medium flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Bajar de peso</div>
                      <div className="text-sm text-muted-foreground">Déficit calórico + cardio</div>
                    </div>
                  </Label>
                  <Label htmlFor="maintain" className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950">
                    <RadioGroupItem value="maintain" id="maintain" className="mt-1" />
                    <div>
                      <div className="font-medium">Mantener peso</div>
                      <div className="text-sm text-muted-foreground">Equilibrio calórico</div>
                    </div>
                  </Label>
                  <Label htmlFor="gain" className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950">
                    <RadioGroupItem value="gain" id="gain" className="mt-1" />
                    <div>
                      <div className="font-medium flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" /> Ganar masa muscular</div>
                      <div className="text-sm text-muted-foreground">Superávit + fuerza</div>
                    </div>
                  </Label>
                </RadioGroup>
              </div>
              <div>
                <Label>Nivel de actividad actual</Label>
                <Select value={data.activityLevel} onValueChange={v => set('activityLevel', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentario (oficina, sin ejercicio)</SelectItem>
                    <SelectItem value="light">Ligero (camino algo, 1-2 días/sem)</SelectItem>
                    <SelectItem value="moderate">Moderado (ejercicio 3-4 días/sem)</SelectItem>
                    <SelectItem value="active">Activo (ejercicio diario o trabajo físico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget" className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Presupuesto semanal para comida (MXN)</Label>
                <Input id="budget" type="number" value={data.budgetPerWeek} onChange={e => set('budgetPerWeek', e.target.value)} placeholder="1500" />
                <p className="text-xs text-muted-foreground mt-1">Esto incluye todas tus comidas de la semana</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Clock className="w-4 h-4" /> Días laborables</div>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <Label key={d.id} htmlFor={d.id} className={`cursor-pointer px-3 py-2 rounded-lg border ${data.workDays.includes(d.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-muted'}`}>
                    <Checkbox id={d.id} checked={data.workDays.includes(d.id)} onCheckedChange={() => toggleArr('workDays', d.id)} className="sr-only" />
                    {d.label}
                  </Label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ws">Inicio trabajo</Label>
                  <Input id="ws" type="time" value={data.workStart} onChange={e => set('workStart', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="we">Fin trabajo</Label>
                  <Input id="we" type="time" value={data.workEnd} onChange={e => set('workEnd', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ls">Inicio lunch</Label>
                  <Input id="ls" type="time" value={data.lunchStart} onChange={e => set('lunchStart', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="le">Fin lunch</Label>
                  <Input id="le" type="time" value={data.lunchEnd} onChange={e => set('lunchEnd', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wake">Despierto</Label>
                  <Input id="wake" type="time" value={data.wakeTime} onChange={e => set('wakeTime', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sleep">Duermo</Label>
                  <Input id="sleep" type="time" value={data.sleepTime} onChange={e => set('sleepTime', e.target.value)} />
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg text-sm text-emerald-800 dark:text-emerald-200">
                Solo te notificaré sobre comidas en tus horas libres y durante tu lunch.
                El ejercicio te lo recordaré después del trabajo.
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <Label className="mb-2 block">Restricciones dietéticas</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY.map(d => (
                    <Badge
                      key={d}
                      variant={data.restrictions.includes(d) ? 'default' : 'outline'}
                      className={`cursor-pointer ${data.restrictions.includes(d) ? 'bg-emerald-600' : ''}`}
                      onClick={() => toggleArr('restrictions', d)}
                    >
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="allergy" className="mb-1 block">Alergias (presiona Enter para agregar)</Label>
                <Input
                  id="allergy"
                  value={data.allergyInput}
                  onChange={e => set('allergyInput', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && data.allergyInput.trim()) {
                      e.preventDefault()
                      toggleArr('allergies', data.allergyInput.trim())
                      set('allergyInput', '')
                    }
                  }}
                  placeholder="Ej. Nueces, leche..."
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.allergies.map((a: string) => (
                    <Badge key={a} variant="destructive" className="cursor-pointer" onClick={() => toggleArr('allergies', a)}>
                      {a} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="dislike" className="mb-1 block">Comidas que NO te gustan</Label>
                <Input
                  id="dislike"
                  value={data.dislikeInput}
                  onChange={e => set('dislikeInput', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && data.dislikeInput.trim()) {
                      e.preventDefault()
                      toggleArr('dislikedFoods', data.dislikeInput.trim())
                      set('dislikeInput', '')
                    }
                  }}
                  placeholder="Ej. Brócoli, atún..."
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.dislikedFoods.map((a: string) => (
                    <Badge key={a} variant="secondary" className="cursor-pointer" onClick={() => toggleArr('dislikedFoods', a)}>
                      {a} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <Label className="mb-2 block">Equipo que tienes disponible</Label>
                <div className="grid grid-cols-1 gap-2">
                  {EQUIPMENT.map(eq => (
                    <Label key={eq} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950">
                      <Checkbox checked={data.equipment.includes(eq)} onCheckedChange={() => toggleArr('equipment', eq)} />
                      <span>{eq}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg text-sm flex gap-2">
                <Salad className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium">¡Listo para empezar!</p>
                  <p className="text-muted-foreground">Al guardar, generaré tu primer plan semanal con la IA y programaré las notificaciones de hoy.</p>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={prev} disabled={step === 1 || loading}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
          </Button>
          {step < 5 ? (
            <Button onClick={next} disabled={!canNext()}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando plan...</> : 'Crear mi plan'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
