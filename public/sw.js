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
