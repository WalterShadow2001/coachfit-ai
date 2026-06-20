'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Sparkles, TrendingUp, TrendingDown, ThumbsUp, AlertCircle, MessageSquare, Calendar } from 'lucide-react'

const DAYS_HISTORY = 7

export default function Feedback() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))

  const load = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const promises = []
      for (let i = 0; i < DAYS_HISTORY; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dStr = d.toISOString().slice(0, 10)
        promises.push(fetch(`/api/feedback?date=${dStr}`).then(r => r.json()).then(j => ({ date: dStr, ...j })))
      }
      const results = await Promise.all(promises)
      const hist = results
        .filter(r => r.feedback)
        .map(r => ({ dateStr: r.date, ...r.feedback }))
        .map(({ dateStr, ...rest }) => ({
          ...rest,
          date: typeof dateStr === 'string' ? dateStr : new Date(dateStr as any).toISOString().slice(0, 10),
        }))
      setHistory(hist)
      const sel = results.find(r => r.date === selectedDate)
      setFeedback(sel?.feedback || null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const generate = async (date: string) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Error')
      }
      const json = await res.json()
      setFeedback({ content: json.feedback, date, score: json.feedback.adherenceScore })
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="p-4 space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
  }

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-500" /> Feedback de tu coach IA</h1>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: DAYS_HISTORY }).map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dStr = d.toISOString().slice(0, 10)
          const hasFb = history.find(h => h.date === dStr)
          return (
            <Button
              key={dStr}
              variant={selectedDate === dStr ? 'default' : 'outline'}
              size="sm"
              className={selectedDate === dStr ? 'bg-emerald-600 whitespace-nowrap' : 'whitespace-nowrap'}
              onClick={() => { setSelectedDate(dStr); setFeedback(history.find(h => h.date === dStr) || null) }}
            >
              {i === 0 ? 'Hoy' : d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
              {hasFb && <span className="ml-1 text-xs">·{hasFb.score ?? '-'}</span>}
            </Button>
          )
        })}
      </div>

      {feedback ? (
        <FeedbackCard feedback={feedback.content} score={feedback.score} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="mb-4 text-muted-foreground">Aún no hay feedback para este día</p>
            <Button onClick={() => generate(selectedDate)} disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando tu día...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generar feedback</>}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">La IA comparará tu plan vs lo que realmente hiciste</p>
          </CardContent>
        </Card>
      )}

      {/* Historial de scores */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tu progreso (7 días)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[...history].reverse().map(h => (
              <button
                key={h.date}
                onClick={() => { setSelectedDate(h.date); setFeedback(h) }}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left"
              >
                <div>
                  <div className="text-sm font-medium">
                    {formatDateLong(h.date)}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{h.content?.summary}</div>
                </div>
                <ScoreBadge score={h.score} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <Badge variant="outline">-</Badge>
  let color = 'bg-rose-500'
  if (score >= 80) color = 'bg-emerald-500'
  else if (score >= 60) color = 'bg-amber-500'
  return <Badge className={color}>{score}/100</Badge>
}

function formatDateLong(date: any): string {
  try {
    const dStr = typeof date === 'string' ? date : new Date(date).toISOString().slice(0, 10)
    return new Date(dStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return String(date)
  }
}

function FeedbackCard({ feedback, score }: { feedback: any; score: number | null }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Análisis del día</CardTitle>
          <ScoreBadge score={score} />
        </div>
        <CardDescription>{formatDateLong(feedback.date)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg text-sm">{feedback.summary}</div>

        {/* Positives */}
        {feedback.positives?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-emerald-600">
              <ThumbsUp className="w-4 h-4" /> Lo que hiciste bien
            </div>
            <ul className="text-sm space-y-1 pl-6 list-disc">
              {feedback.positives.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.improvements?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-amber-600">
              <AlertCircle className="w-4 h-4" /> Para mejorar mañana
            </div>
            <ul className="text-sm space-y-1 pl-6 list-disc">
              {feedback.improvements.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Tomorrow */}
        {feedback.tomorrowRecommendation && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Mañana
            </div>
            <div className="text-sm">{feedback.tomorrowRecommendation}</div>
          </div>
        )}

        {/* Motivational */}
        {feedback.motivationalMessage && (
          <div className="p-3 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <MessageSquare className="w-4 h-4" /> Tu coach te dice
            </div>
            <div className="text-sm italic">"{feedback.motivationalMessage}"</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
