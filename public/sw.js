const CACHE_NAME = 'petvitals-cache-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

// 主動提醒推播：payload 是 api/cron/send-reminders（或測試通知）送出的 JSON 字串
// { title, body, deliveryId }。顯示通知之後回報伺服器「這台手機收到了」，
// 通知中心的推播紀錄才能分辨「推播服務收下但手機沒收到」與「手機收到了但系統沒顯示」
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'PetVitals', body: event.data.text() }
  }

  event.waitUntil(
    self.registration
      .showNotification(payload.title ?? 'PetVitals', {
        body: payload.body,
        icon: '/icon.svg',
        badge: '/icon.svg'
      })
      .then(() => {
        if (!payload.deliveryId) return
        // 回報失敗不影響通知顯示，只是紀錄上會停在「手機沒有回報收到」
        return fetch('/api/push/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryId: payload.deliveryId })
        }).catch(() => undefined)
      })
  )
})

// 點擊通知時優先聚焦已開啟的分頁，而不是永遠開一個新分頁
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const existing = clientsList.find((client) => 'focus' in client)
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    })
  )
})

// 僅快取 GET 請求，且採「先網路、失敗才回退快取」策略：
// 確保打卡等資料永遠讀寫最新的網路回應，離線時只能瀏覽先前造訪過的頁面（不做背景同步佇列）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 只快取成功回應，避免離線時一直重播先前的錯誤頁
        if (response.ok) {
          const responseClone = response.clone()
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone))
              .catch((error) => console.error('Cache write failed', error))
          )
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        return (
          cached ??
          new Response('目前離線，且尚未快取此頁面', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        )
      })
  )
})
