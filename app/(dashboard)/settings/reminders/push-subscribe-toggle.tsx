'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

// Web Push 的 applicationServerKey 要求 Uint8Array，但瀏覽器端生成的 VAPID public key
// 是 URL-safe base64 字串，兩者之間需要手動轉換（沒有內建 API）
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type SupportStatus = 'checking' | 'unsupported' | 'supported'

export function PushSubscribeToggle() {
  const [support, setSupport] = useState<SupportStatus>('checking')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkSupport() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setSupport('unsupported')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (cancelled) return
      setIsSubscribed(existing !== null)
      setSupport('supported')
    }

    checkSupport().catch(() => {
      if (!cancelled) setSupport('unsupported')
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubscribe() {
    setIsPending(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('需要允許瀏覽器通知權限才能接收提醒推播')
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setError('推播功能尚未設定完成，請聯絡管理員')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      })
      if (!response.ok) throw new Error('儲存推播訂閱失敗')

      setIsSubscribed(true)
    } catch {
      setError('開啟推播通知失敗，請稍後再試')
    } finally {
      setIsPending(false)
    }
  }

  async function handleUnsubscribe() {
    setIsPending(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } catch {
      setError('關閉推播通知失敗，請稍後再試')
    } finally {
      setIsPending(false)
    }
  }

  if (support === 'checking') return null

  if (support === 'unsupported') {
    return (
      <p className="text-sm text-muted-foreground">
        這個瀏覽器/裝置不支援推播通知。iOS 需要 16.4 以上，且必須先把 PetVitals 加入主畫面（以 PWA
        開啟）才能使用。
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {isSubscribed
          ? '這個裝置已開啟提醒推播通知。'
          : '開啟後，提醒時間到了會在這個裝置推播通知。'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        disabled={isPending}
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      >
        {isPending ? '處理中…' : isSubscribed ? '關閉這個裝置的推播' : '開啟這個裝置的推播'}
      </Button>
    </div>
  )
}
