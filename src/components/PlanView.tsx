'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Salad, Dumbbell, ShoppingBag, RefreshCw, Clock, Flame } from 'lucide-react'

export default function PlanView() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan/generate')
      const json = await res.json()
      setPlan(json)
      const dayName = new Date().toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
      const found = json.mealPlan?.parsed?.days?.find((d: any) => d.day?.toLowerCase() === dayName)
      setSelectedDay(found?.day || json.mealPlan?.parsed?.days?.[0]?.day || '')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const generate = async (what: 'meal' | 'exercise' | 'both') => {
    setGenerating(true)
    try {
      await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what }),
      })
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const meals = plan?.mealPlan?.parsed?.days || []
  const exercises = plan?.exercisePlan?.parsed?.days || []
  const shoppingList = plan?.mealPlan?.parsed?.shoppingList || []
  const estimatedCost = plan?.mealPlan?.parsed?.estimatedCost || 0

  const selectedMeal = meals.find((m: any) => m.day === selectedDay)
  const selectedExercise = exercises.find((m: any) => m.day === selectedDay)

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Tu plan semanal</h1>
        <Button variant="outline" size="sm" onClick={() => generate('both')} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Regenerar
        </Button>
      </div>

      {!plan?.mealPlan && !plan?.exercisePlan ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Salad className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="mb-4 text-muted-foreground">Aún no tienes un plan generado</p>
            <Button onClick={() => generate('both')} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generar con IA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="meal">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="meal"><Salad className="w-4 h-4 mr-1" /> Comidas</TabsTrigger>
            <TabsTrigger value="exercise"><Dumbbell className="w-4 h-4 mr-1" /> Ejercicio</TabsTrigger>
            <TabsTrigger value="shopping"><ShoppingBag className="w-4 h-4 mr-1" /> Lista</TabsTrigger>
          </TabsList>

          {/* === COMIDAS === */}
          <TabsContent value="meal" className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {meals.map((d: any) => (
                <Button
                  key={d.day}
                  variant={selectedDay === d.day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(d.day)}
                  className={selectedDay === d.day ? 'bg-emerald-600' : ''}
                >
                  {d.day}
                </Button>
              ))}
            </div>

            {selectedMeal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="capitalize">{selectedMeal.day}</span>
                    <Badge variant="secondary" className="flex items-center gap-1"><Flame className="w-3 h-3" /> {selectedMeal.totalCalories} kcal</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MealRow label="Desayuno" meal={selectedMeal.breakfast} icon="🌅" />
                  <MealRow label="Lunch" meal={selectedMeal.lunch} icon="☀️" />
                  <MealRow label="Cena" meal={selectedMeal.dinner} icon="🌙" />
                  {selectedMeal.snacks?.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Snacks</div>
                      {selectedMeal.snacks.map((s: any, i: number) => (
                        <div key={i} className="text-sm flex justify-between">
                          <span>{s.name}</span>
                          <span className="text-muted-foreground">{s.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === EJERCICIO === */}
          <TabsContent value="exercise" className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {exercises.map((d: any) => (
                <Button
                  key={d.day}
                  variant={selectedDay === d.day ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(d.day)}
                  className={selectedDay === d.day ? 'bg-emerald-600' : ''}
                >
                  {d.day}
                </Button>
              ))}
            </div>

            {selectedExercise && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="capitalize">{selectedExercise.day} · {selectedExercise.focus}</span>
                    <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedExercise.totalMinutes} min</Badge>
                  </CardTitle>
                  <CardDescription>{selectedExercise.caloriesBurn} kcal estimadas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedExercise.exercises?.map((ex: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{i + 1}. {ex.name}</div>
                        <Badge variant="outline">{ex.sets} × {ex.reps}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                        <span>⏱ {ex.duration}</span>
                        <span>↻ {ex.rest}</span>
                      </div>
                      {ex.notes && <div className="text-xs mt-1 italic">{ex.notes}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {plan?.exercisePlan?.parsed?.notes && (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                {plan.exercisePlan.parsed.notes}
              </div>
            )}
          </TabsContent>

          {/* === LISTA DE COMPRAS === */}
          <TabsContent value="shopping" className="space-y-3">
            {estimatedCost > 0 && (
              <Card className="bg-emerald-50 dark:bg-emerald-950">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Costo estimado semanal</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">${estimatedCost} MXN</div>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-emerald-600" />
                </CardContent>
              </Card>
            )}
            {shoppingList.map((cat: any, i: number) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cat.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {cat.items?.map((item: string, j: number) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function MealRow({ label, meal, icon }: { label: string; meal: any; icon: string }) {
  if (!meal) return null
  return (
    <div className="border-l-4 border-emerald-400 pl-3 py-1">
      <div className="text-xs text-muted-foreground">{icon} {label} · {meal.prepTime} · {meal.calories} kcal</div>
      <div className="font-medium text-sm">{meal.name}</div>
      {meal.ingredients?.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">{meal.ingredients.join(', ')}</div>
      )}
    </div>
  )
}
