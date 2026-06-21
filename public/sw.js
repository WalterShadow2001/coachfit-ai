// Service Worker para CoachFit AI
// NO cachea nada - siempre va a la red
// Esto evita problemas de versiones cacheadas

const CACHE_NAME = 'coachfit-v2-' + Date.now()

self.addEventListener('install', (event) => {
  // Skip waiting para activar inmediatamente
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Solo GET
  if (request.method !== 'GET') return

  // API calls: siempre network (no cache)
  if (request.url.includes('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Todo lo demás: network first, sin cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(cached => cached || new Response('Offline', { status: 503 })))
  )
})

// Notificaciones push
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || 'CoachFit', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true,
      })
    )
  } catch {}
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    })
  )
})
