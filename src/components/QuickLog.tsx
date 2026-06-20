'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export default function QuickLog() {
  const { quickLogOpen, quickLogPayload, closeQuickLog } = useAppStore()
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('medium')
  const [onPlan, setOnPlan] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (quickLogPayload) {
      setName(quickLogPayload.planned?.name || quickLogPayload.planned?.focus || '')
      setCalories(quickLogPayload.planned?.calories ? String(quickLogPayload.planned.calories) : '')
      setDuration(quickLogPayload.planned?.totalMinutes ? String(quickLogPayload.planned.totalMinutes) : '')
      setOnPlan(null)
      setNotes('')
    }
  }, [quickLogPayload])

  if (!quickLogOpen || !quickLogPayload) return null

  const isMeal = quickLogPayload.type === 'meal'

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Escribe qué ' + (isMeal ? 'comiste' : 'hiciste'))
      return
    }
    setSubmitting(true)
    try {
      const endpoint = isMeal ? '/api/log/meal' : '/api/log/exercise'
      const body = isMeal
        ? {
            type: quickLogPayload.mealType || 'snack',
            actualName: name,
            calories: calories ? Number(calories) : null,
            notes,
            onPlan,
          }
        : {
            actualName: name,
            durationMin: Number(duration) || 0,
            intensity,
            caloriesBurn: calories ? Number(calories) : null,
            notes,
            onPlan,
          }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Error')
      toast.success(isMeal ? 'Comida registrada' : 'Ejercicio registrado')
      closeQuickLog()
    } catch {
      toast.error('No se pudo registrar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={quickLogOpen} onOpenChange={(v) => !v && closeQuickLog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isMeal ? '¿Qué comiste?' : '¿Qué ejercicio hiciste?'}</DialogTitle>
          <DialogDescription>
            Registra rápido lo que hiciste. La IA lo comparará con tu plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {quickLogPayload.planned && (
            <div className="p-2 bg-muted rounded text-xs">
              <div className="text-muted-foreground">Plan para ahora:</div>
              <div className="font-medium">{quickLogPayload.planned.name || quickLogPayload.planned.focus}</div>
            </div>
          )}

          <div>
            <Label htmlFor="qn">{isMeal ? '¿Qué comiste?' : '¿Qué ejercicio hiciste?'}</Label>
            <Input id="qn" value={name} onChange={e => setName(e.target.value)} placeholder={isMeal ? 'Ej. Pollo con arroz' : 'Ej. 30 min caminata'} autoFocus />
          </div>

          {!isMeal && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qd">Duración (min)</Label>
                <Input id="qd" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
              <div>
                <Label>Intensidad</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Calorías {isMeal ? 'consumidas' : 'quemadas'} (opcional)</Label>
            <Input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder={isMeal ? '450' : '300'} />
          </div>

          <div>
            <Label>¿Cumpliste el plan?</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" size="sm" variant={onPlan === true ? 'default' : 'outline'} className={onPlan === true ? 'bg-emerald-600' : ''} onClick={() => setOnPlan(true)}>
                <Check className="w-4 h-4 mr-1" /> Sí
              </Button>
              <Button type="button" size="sm" variant={onPlan === false ? 'default' : 'outline'} className={onPlan === false ? 'bg-rose-600' : ''} onClick={() => setOnPlan(false)}>
                <X className="w-4 h-4 mr-1" /> No
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="qnotes">Notas (opcional)</Label>
            <Textarea id="qnotes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Cómo te sentiste, porciones..." />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={closeQuickLog}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
