'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useNotificationEngine } from '@/hooks/use-notifications'
import { Bell, Check, Clock, X, Loader2, Dumbbell, Apple } from 'lucide-react'

export default function NotificationBanner() {
  const { activeNotification, acknowledge, snooze, skip } = useNotificationEngine()
  const notif = activeNotification

  if (!notif) return null

  let parsedPayload: any = null
  if (notif.payload) {
    try { parsedPayload = JSON.parse(notif.payload) } catch {}
  }

  const icon = notif.type === 'meal' ? <Apple className="w-5 h-5 text-emerald-500" />
    : notif.type === 'exercise' ? <Dumbbell className="w-5 h-5 text-orange-500" />
    : <Bell className="w-5 h-5 text-blue-500" />

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
                  <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
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

          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 bg-emerald-600" onClick={() => acknowledge(notif.id)}>
              <Check className="w-4 h-4 mr-1" /> Ya lo hice
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => snooze(notif.id)}>
              <Clock className="w-4 h-4 mr-1" /> Más tarde
            </Button>
            <Button size="sm" variant="ghost" onClick={() => skip(notif.id)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
