'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useNotificationEngine } from '@/hooks/use-notifications'
import { Bell, Check, Clock, Dumbbell, Apple, Mic } from 'lucide-react'

export default function NotificationBanner() {
  const { activeNotification, acknowledge, snooze } = useNotificationEngine()
  const openQuickLog = useAppStore(s => s.openQuickLog)
  const notif = activeNotification

  if (!notif) return null

  let parsedPayload: any = null
  if (notif.payload) {
    try { parsedPayload = JSON.parse(notif.payload) } catch {}
  }

  const icon = notif.type === 'meal' ? <Apple className="w-5 h-5 text-emerald-500" />
    : notif.type === 'exercise' ? <Dumbbell className="w-5 h-5 text-orange-500" />
    : <Bell className="w-5 h-5 text-blue-500" />

  const handleAck = () => {
    // Marca la notificación como acknowledged
    acknowledge(notif.id)
    // Si es comida o ejercicio, abre el quick log (texto)
    if (notif.type === 'meal' || notif.type === 'exercise') {
      const payload = parsedPayload || {}
      openQuickLog({ ...payload, type: notif.type, notificationId: notif.id, voice: false })
    }
  }

  const handleAckWithVoice = () => {
    acknowledge(notif.id)
    if (notif.type === 'meal' || notif.type === 'exercise') {
      const payload = parsedPayload || {}
      openQuickLog({ ...payload, type: notif.type, notificationId: notif.id, voice: true })
    } else {
      // feedback/reminder: abrir quick log genérico en modo voz
      openQuickLog({ type: notif.type, notificationId: notif.id, voice: true })
    }
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 max-w-2xl mx-auto animate-in slide-in-from-bottom duration-300">
      <Card className="border-emerald-400 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-sm">{notif.title}</h3>
                {notif.retryCount > 0 && (
                  <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded dark:bg-amber-900 dark:text-amber-200">
                    Intento #{notif.retryCount + 1}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{notif.body}</p>
              {parsedPayload?.planned && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <div className="font-medium">Plan para ahora:</div>
                  <div className="text-muted-foreground">
                    {parsedPayload.planned.name || parsedPayload.planned.focus}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones: solo "Ya lo hice" (con voz opcional) y "Más tarde" */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button size="sm" className="bg-emerald-600" onClick={handleAck}>
              <Check className="w-4 h-4 mr-1" /> Ya lo hice
            </Button>
            <Button size="sm" variant="outline" onClick={() => snooze(notif.id)}>
              <Clock className="w-4 h-4 mr-1" /> Más tarde
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="w-full mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-800"
            onClick={handleAckWithVoice}
          >
            <Mic className="w-4 h-4 mr-2" /> Responder con voz
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
