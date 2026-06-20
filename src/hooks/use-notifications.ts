'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  scheduledFor: string
  status: string
  retryCount: number
  payload?: string | null
}

export function useNotificationEngine() {
  const activeNotification = useAppStore(s => s.activeNotification)
  const setActiveNotification = useAppStore(s => s.setActiveNotification)
  const openQuickLog = useAppStore(s => s.openQuickLog)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifyingRef = useRef(false)

  // 1. Pedir permiso al montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // 2. Polling cada 30s para ver si hay notificaciones pendientes
  const checkServer = useCallback(async () => {
    if (notifyingRef.current) return // ya hay una activa, no interrumpir
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      if (!data.enabled) return
      if (data.notifications && data.notifications.length > 0) {
        const notif = data.notifications[0]
        setActiveNotification(notif)
        notifyingRef.current = true
        // Mostrar notificación del sistema si tenemos permiso
        showSystemNotification(notif)
      }
    } catch (e) {
      // silencioso
    }
  }, [setActiveNotification])

  useEffect(() => {
    checkServer()
    pollingRef.current = setInterval(checkServer, 30000) // cada 30s
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [checkServer])

  // 3. Acciones del usuario
  const acknowledge = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'acknowledge' }),
    })
    setActiveNotification(null)
    notifyingRef.current = false
    // Abrir quick log si era una notificación de comida o ejercicio
    const cached = activeNotification
    if (cached && (cached.type === 'meal' || cached.type === 'exercise')) {
      const payload = cached.payload ? JSON.parse(cached.payload) : null
      openQuickLog({ ...payload, type: cached.type, notificationId: id })
    }
    // Re-check tras 1s
    setTimeout(checkServer, 1000)
  }, [activeNotification, setActiveNotification, openQuickLog, checkServer])

  const snooze = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'snooze' }),
    })
    setActiveNotification(null)
    notifyingRef.current = false
    setTimeout(checkServer, 1000)
  }, [setActiveNotification, checkServer])

  const skip = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'skip' }),
    })
    setActiveNotification(null)
    notifyingRef.current = false
    setTimeout(checkServer, 1000)
  }, [setActiveNotification, checkServer])

  return { activeNotification, acknowledge, snooze, skip, checkServer }
}

function showSystemNotification(notif: NotificationItem) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(notif.title, {
      body: notif.body,
      tag: notif.id,
      requireInteraction: true,
      icon: '/logo.svg',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {}
}
