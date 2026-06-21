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
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/store'
import { Loader2, ChevronLeft, ChevronRight, Dumbbell, Salad, Wallet, Clock, Heart, Plus, Trash2, Calendar, LogOut } from 'lucide-react'
import { toast } from 'sonner'

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

const MEDICAL_CONDITIONS = [
  { id: 'diabetes_type_2', label: 'Diabetes Tipo 2', desc: 'Control de azúcar' },
  { id: 'diabetes_type_1', label: 'Diabetes Tipo 1', desc: 'Insulina' },
  { id: 'bariatric', label: 'Cirugía bariátrica', desc: 'Post-operatoria' },
  { id: 'hypertension', label: 'Hipertensión', desc: 'Presión alta' },
  { id: 'hypothyroidism', label: 'Hipotiroidismo', desc: 'Tiroides lenta' },
  { id: 'pcos', label: 'SOP', desc: 'Ovario poliquístico' },
  { id: 'cholesterol', label: 'Colesterol alto', desc: 'Dislipidemia' },
  { id: 'gastritis', label: 'Gastritis', desc: 'Estómago sensible' },
  { id: 'anemia', label: 'Anemia', desc: 'Falta de hierro' },
  { id: 'none', label: 'Ninguna', desc: 'Sin condiciones' },
]

interface ScheduleBlock {
  id: string
  label: string
  days: string[]
  workStart: string
  workEnd: string
  lunchStart: string
  lunchEnd: string
  isFreeDay: boolean
  notes?: string
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setHasProfile = useAppStore(s => s.setHasProfile)
  const setView = useAppStore(s => s.setView)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      // Limpiar estado local
      localStorage.clear()
      // Recargar la página para que vuelva al login
      window.location.href = '/'
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const [data, setData] = useState<any>({
    name: '',
    age: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    activityLevel: 'sedentary',
    budgetPerWeek: '1500',
    wakeTime: '07:00',
    sleepTime: '23:00',
    restrictions: [],
    allergies: [],
    dislikedFoods: [],
    equipment: ['Sin equipo (peso corporal)'],
    goal: 'lose',
    medicalConditions: [],
    medicalNotes: '',
    allergyInput: '',
    dislikeInput: '',
    // Horarios múltiples - por defecto L-V trabajo + sábado trabajo + domingo libre
    schedules: [
      {
        id: 's1',
        label: 'Trabajo Lunes-Viernes',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        workStart: '09:00',
        workEnd: '18:00',
        lunchStart: '14:00',
        lunchEnd: '15:00',
        isFreeDay: false,
        notes: '',
      },
      {
        id: 's2',
        label: 'Sábado (trabajo diferente)',
        days: ['sat'],
        workStart: '10:00',
        workEnd: '14:00',
        lunchStart: '14:00',
        lunchEnd: '15:00',
        isFreeDay: false,
        notes: 'Horario reducido',
      },
      {
        id: 's3',
        label: 'Domingo (Iglesia + libre)',
        days: ['sun'],
        workStart: '10:00',
        workEnd: '12:00',
        lunchStart: '14:00',
        lunchEnd: '15:00',
        isFreeDay: true,
        notes: 'Misa a las 10am',
      },
    ],
  })

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))

  const toggleArr = (k: string, v: string) => {
    setData((d: any) => {
      const arr = d[k] || []
      return { ...d, [k]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] }
    })
  }

  // === Manejo de horarios múltiples ===
  const addSchedule = () => {
    const newId = `s${Date.now()}`
    set('schedules', [...data.schedules, {
      id: newId,
      label: `Horario ${data.schedules.length + 1}`,
      days: [],
      workStart: '09:00',
      workEnd: '18:00',
      lunchStart: '14:00',
      lunchEnd: '15:00',
      isFreeDay: false,
      notes: '',
    }])
  }

  const updateSchedule = (id: string, field: string, value: any) => {
    set('schedules', data.schedules.map((s: ScheduleBlock) =>
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const removeSchedule = (id: string) => {
    if (data.schedules.length <= 1) {
      toast.error('Debes tener al menos 1 horario')
      return
    }
    set('schedules', data.schedules.filter((s: ScheduleBlock) => s.id !== id))
  }

  const toggleScheduleDay = (scheduleId: string, dayId: string) => {
    const sched = data.schedules.find((s: ScheduleBlock) => s.id === scheduleId)
    if (!sched) return
    const newDays = sched.days.includes(dayId)
      ? sched.days.filter((d: string) => d !== dayId)
      : [...sched.days, dayId]
    updateSchedule(scheduleId, 'days', newDays)
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
    if (step === 3) {
      // Validar que todos los horarios tengan al menos 1 día
      return data.schedules.every((s: ScheduleBlock) => s.days.length > 0) && data.schedules.length > 0 && data.wakeTime && data.sleepTime
    }
    if (step === 4) return true
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Banner de logout - siempre visible arriba */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm">
        <span>¿No es tu cuenta? Puedes cerrar sesión</span>
        <button
          onClick={handleLogout}
          className="bg-white text-amber-600 px-3 py-1 rounded font-bold text-xs hover:bg-amber-50"
        >
          CERRAR SESIÓN
        </button>
      </div>
      <Card className="w-full max-w-lg mt-10">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">CoachFit AI</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-muted-foreground">
              <LogOut className="w-3 h-3 mr-1" /> Cerrar sesión
            </Button>
          </div>
          <Progress value={(step / 5) * 100} className="h-2 mb-2" />
          <CardTitle className="text-2xl">
            {step === 1 && 'Tu información básica'}
            {step === 2 && 'Tu objetivo y presupuesto'}
            {step === 3 && 'Tus horarios semanales'}
            {step === 4 && 'Preferencias alimenticias'}
            {step === 5 && 'Equipo disponible'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Necesito estos datos para calcular tus calorías diarias'}
            {step === 2 && 'Esto me ayuda a crear un plan realista que puedas cumplir'}
            {step === 3 && 'Diferentes días pueden tener horarios diferentes (trabajo, sábado, iglesia, etc.)'}
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

              {/* Condiciones médicas */}
              <div className="border-t pt-3">
                <Label className="mb-2 block">¿Tienes alguna condición médica?</Label>
                <p className="text-xs text-muted-foreground mb-2">La IA ajustará tu dieta y ejercicio según tus condiciones</p>
                <div className="grid grid-cols-2 gap-2">
                  {MEDICAL_CONDITIONS.map(c => (
                    <label key={c.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      data.medicalConditions.includes(c.id) ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                    }`}>
                      <Checkbox
                        checked={data.medicalConditions.includes(c.id)}
                        onCheckedChange={() => {
                          if (c.id === 'none') {
                            set('medicalConditions', ['none'])
                          } else {
                            const filtered = data.medicalConditions.filter((x: string) => x !== 'none')
                            set('medicalConditions', filtered.includes(c.id)
                              ? filtered.filter((x: string) => x !== c.id)
                              : [...filtered, c.id])
                          }
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <Input
                  className="mt-2"
                  value={data.medicalNotes}
                  onChange={e => set('medicalNotes', e.target.value)}
                  placeholder="Notas adicionales sobre tu salud (opcional)"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* Horarios múltiples */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    Tus horarios
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addSchedule}>
                    <Plus className="w-3 h-3 mr-1" /> Agregar horario
                  </Button>
                </div>

                {data.schedules.map((sched: ScheduleBlock, idx: number) => (
                  <Card key={sched.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={sched.label}
                          onChange={e => updateSchedule(sched.id, 'label', e.target.value)}
                          className="font-medium h-8"
                          placeholder="Ej. Trabajo L-V, Sábado, Iglesia"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeSchedule(sched.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      {/* Días */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Días</div>
                        <div className="flex flex-wrap gap-1">
                          {DAYS.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleScheduleDay(sched.id, d.id)}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                sched.days.includes(d.id)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:bg-muted'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Free day toggle */}
                      <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                        <div>
                          <div className="text-sm font-medium">Día libre (no trabajo)</div>
                          <div className="text-xs text-muted-foreground">Marca si es descanso/iglesia/etc</div>
                        </div>
                        <Switch
                          checked={sched.isFreeDay}
                          onCheckedChange={v => updateSchedule(sched.id, 'isFreeDay', v)}
                        />
                      </div>

                      {/* Horarios */}
                      {!sched.isFreeDay && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Inicio trabajo</Label>
                            <Input
                              type="time"
                              value={sched.workStart}
                              onChange={e => updateSchedule(sched.id, 'workStart', e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Fin trabajo</Label>
                            <Input
                              type="time"
                              value={sched.workEnd}
                              onChange={e => updateSchedule(sched.id, 'workEnd', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Inicio comida</Label>
                          <Input
                            type="time"
                            value={sched.lunchStart}
                            onChange={e => updateSchedule(sched.id, 'lunchStart', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fin comida</Label>
                          <Input
                            type="time"
                            value={sched.lunchEnd}
                            onChange={e => updateSchedule(sched.id, 'lunchEnd', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Notas (opcional)</Label>
                        <Input
                          value={sched.notes || ''}
                          onChange={e => updateSchedule(sched.id, 'notes', e.target.value)}
                          placeholder="Ej. Misa 10am, gym en la tarde..."
                          className="h-8"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Wake/sleep global */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <Label htmlFor="wake">Despierto (general)</Label>
                  <Input id="wake" type="time" value={data.wakeTime} onChange={e => set('wakeTime', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sleep">Duermo (general)</Label>
                  <Input id="sleep" type="time" value={data.sleepTime} onChange={e => set('sleepTime', e.target.value)} />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg text-sm text-emerald-800 dark:text-emerald-200 flex gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Ejemplos de uso:</p>
                  <p className="text-xs mt-1">• L-V: trabajo 9-18, lunch 14-15</p>
                  <p className="text-xs">• Sábado: trabajo 10-14, lunch 14-15</p>
                  <p className="text-xs">• Domingo: día libre (iglesia), lunch 14-15</p>
                </div>
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
                      className={`cursor-pointer ${data.restrictions.includes(d) ? 'bg-primary' : ''}`}
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
                <Salad className="w-4 h-4 text-primary shrink-0" />
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
