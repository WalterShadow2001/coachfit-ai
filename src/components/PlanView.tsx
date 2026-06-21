'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Loader2, Salad, Dumbbell, ShoppingBag, RefreshCw, Clock, Flame, ChefHat, ListOrdered, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function PlanView() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [recipeModal, setRecipeModal] = useState<any>(null)

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
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await load()
      toast.success('Plan generado con IA')
    } catch (e: any) {
      toast.error(e.message)
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
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando con IA...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generar con IA</>}
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
                  className={selectedDay === d.day ? 'bg-primary' : ''}
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
                  <MealRow label="Desayuno" meal={selectedMeal.breakfast} icon="🌅" onClick={() => setRecipeModal({ ...selectedMeal.breakfast, mealLabel: 'Desayuno' })} />
                  <MealRow label="Lunch" meal={selectedMeal.lunch} icon="☀️" onClick={() => setRecipeModal({ ...selectedMeal.lunch, mealLabel: 'Lunch' })} />
                  <MealRow label="Cena" meal={selectedMeal.dinner} icon="🌙" onClick={() => setRecipeModal({ ...selectedMeal.dinner, mealLabel: 'Cena' })} />
                  {selectedMeal.snacks?.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Snacks</div>
                      {selectedMeal.snacks.map((s: any, i: number) => (
                        <div key={i} className="text-sm flex justify-between cursor-pointer hover:bg-muted p-1 rounded" onClick={() => setRecipeModal({ ...s, mealLabel: 'Snack' })}>
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
                  className={selectedDay === d.day ? 'bg-primary' : ''}
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

      {/* MODAL DE RECETA */}
      <Dialog open={!!recipeModal} onOpenChange={(v) => !v && setRecipeModal(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ChefHat className="w-5 h-5 text-primary" />
              {recipeModal?.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipeModal?.calories} kcal</span>
              {recipeModal?.prepTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipeModal.prepTime}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ingredientes */}
            {recipeModal?.ingredients?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <ListOrdered className="w-4 h-4 text-primary" /> Ingredientes
                </h3>
                <ul className="space-y-1">
                  {recipeModal.ingredients.map((ing: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instrucciones */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <ChefHat className="w-4 h-4 text-primary" /> Preparación
              </h3>
              <ol className="space-y-2">
                {generateRecipeSteps(recipeModal).map((step: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">💡 Tip del chef</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {getRecipeTip(recipeModal?.name)}
              </div>
            </div>

            {/* Info nutricional */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Calorías</div>
                <div className="font-bold">{recipeModal?.calories || 0}</div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Tiempo</div>
                <div className="font-bold">{recipeModal?.prepTime || '-'}</div>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Ingredientes</div>
                <div className="font-bold">{recipeModal?.ingredients?.length || 0}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MealRow({ label, meal, icon, onClick }: { label: string; meal: any; icon: string; onClick: () => void }) {
  if (!meal) return null
  return (
    <div
      className="border-l-4 border-primary pl-3 py-2 cursor-pointer hover:bg-muted/50 rounded-r-lg transition-colors"
      onClick={onClick}
    >
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label} · {meal.prepTime} · {meal.calories} kcal
      </div>
      <div className="font-medium text-sm">{meal.name}</div>
      {meal.ingredients?.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">{meal.ingredients.join(', ')}</div>
      )}
      <div className="text-xs text-primary mt-1 flex items-center gap-1">
        <ChefHat className="w-3 h-3" /> Ver receta completa →
      </div>
    </div>
  )
}

function generateRecipeSteps(meal: any): string[] {
  const name = meal?.name || ''
  const ingredients = meal?.ingredients || []

  // Generar pasos basados en el tipo de comida
  if (name.toLowerCase().includes('avena')) {
    return [
      'Calienta la leche en una olla pequeña a fuego medio hasta que tibia.',
      'Agrega la avena y cocina por 3-5 minutos, revolviendo constantemente.',
      'Retira del fuego y vierte en un tazón.',
      'Corta el plátano en rodajas y agrega a la avena.',
      'Esparce las nueces picadas por encima.',
      'Sirve inmediatamente. ¡Disfruta!'
    ]
  }
  if (name.toLowerCase().includes('pollo') || name.toLowerCase().includes('pechuga')) {
    return [
      'Sazona la pechuga de pollo con sal, pimienta y un chorrito de aceite de oliva.',
      'Calienta un sartén a fuego medio-alto.',
      'Cocina el pollo 5-6 minutos por lado hasta que esté dorado y cocido por dentro.',
      'Mientras tanto, cocina el arroz: hierve agua, agrega arroz, baja el fuego y tapa por 18 minutos.',
      'Lava y corta las verduras para la ensalada.',
      'Sirve el pollo con arroz y ensalada al lado.',
      'Opcional: agrega limón y un poco de aceite de oliva a la ensalada.'
    ]
  }
  if (name.toLowerCase().includes('huevo')) {
    return [
      'Calienta un poco de aceite o mantequilla en un sartén a fuego medio.',
      'Casca los huevos en un tazón y bate ligeramente con sal y pimienta.',
      'Vierte los huevos en el sartén y revuelve suavemente.',
      'Agrega las verduras picadas cuando los hueves empiecezn a cuajar.',
      'Cocina 2-3 minutos hasta que estén a tu gusto.',
      'Calienta la tortilla en un comal por 10 segundos por lado.',
      'Sirve los huevos sobre o junto a la tortilla.'
    ]
  }
  if (name.toLowerCase().includes('atún') || name.toLowerCase().includes('tostada')) {
    return [
      'Escurre el atún y mézclalo con cebolla picada, jitomate picado y un poco de mayonesa o limón.',
      'Sazona con sal y pimienta al gusto.',
      'Coloca una capa de lechuga picada sobre cada tostada.',
      'Agrega la mezcla de atún encima de la lechuga.',
      'Decora con rodajas de jitomate y aguacate si tienes.',
      'Sirve inmediatamente para que las tostadas queden crujientes.'
    ]
  }
  if (name.toLowerCase().includes('ensalada')) {
    return [
      'Lava y desinfecta todas las verduras.',
      'Corta la lechuga, jitomate, pepino y zanahoria en trozos pequeños.',
      'Si incluye proteína, cocínala (pollo a la plancha, huevo duro, etc.).',
      'Mezcla todas las verduras en un tazón grande.',
      'Agrega la proteína cocida y cortada.',
      'Aliña con aceite de oliva, limón, sal y pimienta.',
      'Sirve inmediatamente.'
    ]
  }
  if (name.toLowerCase().includes('arroz')) {
    return [
      'Lava el arroz bajo agua fría hasta que salga clara.',
      'En una olla, calienta un poco de aceite y sofríe el arroz 1 minuto.',
      'Agrega 2 tazas de agua por cada taza de arroz y sal al gusto.',
      'Cuando hierva, baja el fuego al mínimo y tapa.',
      'Cocina 18-20 minutos sin destapar.',
      'Apaga el fuego y deja reposar 5 minutos con la tapa puesta.',
      'Esponja con un tenedor y sirve.'
    ]
  }
  if (name.toLowerCase().includes('sopa') || name.toLowerCase().includes('lenteja')) {
    return [
      'Lava las lentejas y déjalas remojar 30 minutos (opcional).',
      'En una olla grande, sofríe cebolla y ajo picados en aceite.',
      'Agrega las lentejas escurridas y revuelve.',
      'Cubre con agua o caldo (aprox 3 tazas por cada taza de lentejas).',
      'Agrega zanahoria y papa en cubos.',
      'Cocina a fuego medio 25-30 minutos hasta que las lentejas estén suaves.',
      'Sazona con sal, comino y pimienta al gusto.',
      'Sirve caliente con trocitos de aguacate y limón.'
    ]
  }
  if (name.toLowerCase().includes('manzana') || name.toLowerCase().includes('fruta')) {
    return [
      'Lava bien la fruta.',
      'Corta en trozos del tamaño que prefieras.',
      'Si es snack con yogur, sirve el yogur en un tazón.',
      'Agrega la fruta picada encima.',
      'Opcional: espolvorea canela o nueces.',
      'Sirve inmediatamente.'
    ]
  }
  if (name.toLowerCase().includes('yogur')) {
    return [
      'Sirve el yogur natural en un tazón.',
      'Agrega fruta picada (plátano, fresa, arándanos).',
      'Esparce nueces o almendras picadas.',
      'Opcional: agrega un poco de miel.',
      'Revuelve suavemente y disfruta.'
    ]
  }
  if (name.toLowerCase().includes('tortilla') || name.toLowerCase().includes('taco')) {
    return [
      'Calienta las tortillas en un comal por 10 segundos por lado.',
      'Prepara el relleno según la receta (pollo, pescado, verduras, etc.).',
      'Coloca el relleno sobre cada tortilla.',
      'Agrega toppings: cebolla, cilantro, limón, salsa.',
      'Sirve inmediatamente mientras estén calientes.'
    ]
  }

  // Pasos genéricos
  const steps = [
    'Reúne todos los ingredientes listados.',
    'Lava y desinfecta las verduras y frutas.',
    'Prepara los ingredientes según se indique (cortar, picar, etc.).',
    'Cocina según el tipo de platillo (a la plancha, hervido, etc.).',
    'Sazona con sal, pimienta y especias al gusto.',
    'Sirve caliente y disfruta.',
  ]
  return steps
}

function getRecipeTip(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('pollo')) return 'El pollo está listo cuando la temperatura interna llega a 75°C. No lo sobrecocines para que quede jugoso.'
  if (n.includes('huevo')) return 'Para huevos revueltos perfectos, cocina a fuego medio-bajo y retira del fuego justo antes de que parezcan listos.'
  if (n.includes('avena')) return 'La avena se puede preparar la noche anterior con leche fría (overnight oats) para ahorrar tiempo en la mañana.'
  if (n.includes('ensalada')) return 'Aliña la ensalada justo antes de comer para que las hojas no se marchiten.'
  if (n.includes('arroz')) return 'Nunca destapes la olla mientras el arroz se cocina. La paciencia es clave para un arroz perfecto.'
  if (n.includes('atún')) return 'El atún en lata ya está cocido. Solo mézclalo con los ingredientes y sirve frío.'
  if (n.includes('sopa') || n.includes('lenteja')) return 'Las lentejas cocinan más rápido si las remojas en agua 30 minutos antes.'
  return 'Prepara todos los ingredientes antes de empezar a cocinar (mise en place) para que todo salga más fácil.'
}
