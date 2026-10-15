// Web Push 的 applicationServerKey 要求 Uint8Array，但瀏覽器端生成的 VAPID public key
// 是 URL-safe base64 字串，兩者之間需要手動轉換（沒有內建 API）
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ready 在 Service Worker 註冊失敗時可能永遠 pending，避免 UI 一直卡在檢查中。
export async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('推播初始化逾時')), 10_000)
      })
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}
