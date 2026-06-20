'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { Loader2, Sparkles, Flame, Apple, Dumbbell, TrendingDown, Bell, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts'
import SamsungHealthCard from './SamsungHealthCard'

export default function Dashboard() {
  const setView = useAppStore(s => s.setView)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [todayMeal, setTodayMeal] = useState<any>(null)
  const [todayExercise, setTodayExercise] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [statsRes, planRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/plan/generate'),
      ])
      const s = await statsRes.json()
      const p = await planRes.json()
      setStats(s)
      setPlan(p)
      // Día actual
      const dayName = new Date().toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
      if (p.mealPlan?.parsed?.days) {
        setTodayMeal(p.mealPlan.parsed.days.find((d: any) => d.day?.toLowerCase() === dayName))
      }
      if (p.exercisePlan?.parsed?.days) {
        setTodayExercise(p.exercisePlan.parsed.days.find((d: any) => d.day?.toLowerCase() === dayName))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const generatePlan = async () => {
    setGenerating(true)
    try {
      await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what: 'both' }),
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
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const profile = stats?.profile
  const byDayArr = stats?.byDay ? Object.entries(stats.byDay).map(([date, v]: any) => ({
    date: date.slice(5),
    score: v.score ?? 0,
    meals: v.meals,
    exerciseMin: v.exerciseMin,
    caloriesBurn: v.caloriesBurn,
  })) : []

  return (
    <div className="space-y-4 p-4 pb-24 max-w-3xl mx-auto">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Hola, {profile?.name || '👋'}</p>
              <h2 className="text-2xl font-bold">Hoy es un buen día para cumplir tu meta</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{profile?.weightKg || '-'}</div>
              <div className="text-emerald-100 text-xs">kg actual</div>
              <div className="text-xs mt-1">→ {profile?.targetWeightKg} kg meta</div>
            </div>
          </div>
          <Progress
            value={profile ? ((profile.weightKg - profile.targetWeightKg) / profile.weightKg) * 100 : 0}
            className="mt-4 h-2 bg-emerald-800"
          />
        </CardContent>
      </Card>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Apple className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
            <div className="text-2xl font-bold">{stats?.totalMeals || 0}</div>
            <div className="text-xs text-muted-foreground">Comidas (7d)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Dumbbell className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{stats?.totalExerciseMin || 0}</div>
            <div className="text-xs text-muted-foreground">Min ejercicio</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <div className="text-2xl font-bold">{stats?.totalCaloriesBurned || 0}</div>
            <div className="text-xs text-muted-foreground">Cal quemadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Samsung Health */}
      <SamsungHealthCard />

      {/* Plan del día */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Tu día de hoy
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setView('plan')}>
              Ver todo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!plan?.mealPlan && !plan?.exercisePlan ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Aún no tienes un plan generado</p>
              <Button onClick={generatePlan} disabled={generating}>
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</> : 'Generar plan con IA'}
              </Button>
            </div>
          ) : (
            <>
              {todayMeal && (
                <div className="border-l-4 border-emerald-500 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">Comidas de hoy</div>
                  <div className="text-sm font-medium">{todayMeal.breakfast?.name} · {todayMeal.lunch?.name} · {todayMeal.dinner?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{todayMeal.totalCalories} kcal planeadas</div>
                </div>
              )}
              {todayExercise && (
                <div className="border-l-4 border-orange-500 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">Ejercicio de hoy</div>
                  <div className="text-sm font-medium">{todayExercise.focus}</div>
                  <div className="text-xs text-muted-foreground mt-1">{todayExercise.exercises?.length} ejercicios · {todayExercise.totalMinutes} min · {todayExercise.caloriesBurn} kcal</div>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setView('log')}>
                Registrar comida o ejercicio
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de adherencia */}
      {byDayArr.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingDown className="w-5 h-5 text-blue-500" /> Adherencia (7 días)</CardTitle>
            <CardDescription>Qué tanto seguiste el plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={byDayArr}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} name="Adherencia" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de ejercicio */}
      {byDayArr.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ejercicio semanal (min)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDayArr}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="exerciseMin" fill="#f97316" name="Minutos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Feedback reciente */}
      {stats?.recentFeedbacks?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Último feedback de la IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg">
              <div className="text-sm text-emerald-900 dark:text-emerald-100">{stats.recentFeedbacks[stats.recentFeedbacks.length - 1].content.summary}</div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setView('feedback')}>
              Ver todo el feedback
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notificaciones pendientes */}
      {stats?.pendingNotifications > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <div className="font-medium">{stats.pendingNotifications} recordatorio(s) pendiente(s)</div>
              <div className="text-xs text-muted-foreground">Te los iré recordando durante el día</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
