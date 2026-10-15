'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getReadyServiceWorker, urlBase64ToUint8Array } from '@/lib/push/browser'

type SupportStatus = 'checking' | 'unsupported' | 'supported' | 'error'

export function PushSubscribeToggle() {
  const [support, setSupport] = useState<SupportStatus>('checking')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [checkAttempt, setCheckAttempt] = useState(0)
  // 訂閱/取消訂閱進行中時要擋掉背景刷新：權限視窗會讓頁面失焦再取得焦點，
  // 刷新讀到的 getSubscription() 可能是「還沒訂閱」的舊狀態，晚一步回來就會覆寫掉正確結果
  const isMutatingRef = useRef(false)
  // 每次訂閱/取消訂閱都遞增；背景檢查開始時記下版本，回來時版本變了就丟棄結果，
  // 避免「檢查先讀到舊狀態、中間訂閱流程跑完、檢查才回來」覆寫掉剛成功的結果
  const mutationVersionRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    // 只有初次檢查失敗才整個切到錯誤畫面；之後的背景刷新失敗保留上一次的已知狀態，
    // 不要因為切回分頁時 SW 剛好沒回應，就把已經可用的開關換成錯誤訊息
    let isInitialCheck = true
    // 刻意用 effect 內的區域變數而不是 ref：effect 因 checkAttempt 重跑時，舊 effect 還在飛的
    // 檢查不能擋住新 effect 的初次檢查，否則畫面會永遠卡在「檢查中」
    let isChecking = false

    async function checkSupport() {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        if (!cancelled) setSupport('unsupported')
        return
      }
      const versionAtStart = mutationVersionRef.current
      const registration = await getReadyServiceWorker()
      const existing = await registration.pushManager.getSubscription()
      if (cancelled || mutationVersionRef.current !== versionAtStart) return
      setIsSubscribed(existing !== null)
      setPermission(Notification.permission)
      setSupport('supported')
    }

    function refreshSupport() {
      // 切走時不用檢查；回到前景時 focus 與 visibilitychange 會連續觸發，用 isChecking 合併成一次
      if (document.visibilityState !== 'visible') return
      if (isMutatingRef.current || isChecking) return

      const wasInitialCheck = isInitialCheck
      isInitialCheck = false
      isChecking = true
      checkSupport()
        .catch(() => {
          if (!cancelled && wasInitialCheck) setSupport('error')
        })
        .finally(() => {
          isChecking = false
        })
    }

    refreshSupport()
    window.addEventListener('focus', refreshSupport)
    document.addEventListener('visibilitychange', refreshSupport)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshSupport)
      document.removeEventListener('visibilitychange', refreshSupport)
    }
  }, [checkAttempt])

  async function handleSubscribe() {
    isMutatingRef.current = true
    mutationVersionRef.current += 1
    setIsPending(true)
    setError(null)
    try {
      const requestedPermission = await Notification.requestPermission()
      setPermission(requestedPermission)
      if (requestedPermission !== 'granted') {
        setError('需要允許瀏覽器通知權限才能接收提醒推播')
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setError('推播功能尚未設定完成，請聯絡管理員')
        return
      }

      const registration = await getReadyServiceWorker()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      try {
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON())
        })
        if (!response.ok) throw new Error('儲存推播訂閱失敗')
      } catch (saveError) {
        // 瀏覽器已訂閱、伺服器卻沒存到：不撤銷的話，focus 重新檢查會讀到瀏覽器端有訂閱，
        // 把畫面誤判成「已開啟」，但 cron 找不到這筆憑證，提醒永遠不會送達，使用者也沒有重試入口
        await subscription.unsubscribe().catch(() => false)
        throw saveError
      }

      setIsSubscribed(true)
    } catch {
      setError('開啟推播通知失敗，請稍後再試')
    } finally {
      isMutatingRef.current = false
      setIsPending(false)
    }
  }

  async function handleUnsubscribe() {
    isMutatingRef.current = true
    mutationVersionRef.current += 1
    setIsPending(true)
    setError(null)
    try {
      const registration = await getReadyServiceWorker()
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const { endpoint } = subscription
        // 先撤銷瀏覽器端（這才是「是否還會收到推播」的事實）。之後伺服器刪除若失敗，殘留的憑證
        // 會在下次推播收到 404/410 時被 lib/push/send.ts 自動清掉；反過來先刪伺服器的話，
        // 失敗會留下「畫面顯示已開啟、伺服器卻沒有紀錄」的不一致
        const isUnsubscribed = await subscription.unsubscribe()
        if (!isUnsubscribed) throw new Error('瀏覽器取消推播訂閱失敗')

        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        })
        if (!response.ok) console.error('[push] 伺服器端刪除訂閱失敗，等待推播時自動清理')
      }
      setIsSubscribed(false)
    } catch {
      setError('關閉推播通知失敗，請稍後再試')
    } finally {
      isMutatingRef.current = false
      setIsPending(false)
    }
  }

  if (support === 'checking') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        正在檢查本裝置的推播狀態…
      </p>
    )
  }

  if (support === 'unsupported') {
    return (
      <p className="text-sm text-muted-foreground">
        這個瀏覽器/裝置不支援推播通知。iOS 需要 16.4 以上，且必須先把 PetVitals 加入主畫面（以 PWA
        開啟）才能使用。
      </p>
    )
  }

  if (support === 'error') {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm text-destructive">
          暫時無法檢查本裝置推播狀態，請重試。
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setSupport('checking')
            setCheckAttempt((attempt) => attempt + 1)
          }}
        >
          重新檢查
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {permission === 'denied' && (
        <p role="status" className="text-sm text-muted-foreground">
          本裝置的通知權限已被封鎖，請先到瀏覽器或系統設定允許通知，再重新整理此頁。
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {isSubscribed && permission === 'granted'
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
        disabled={isPending || (permission === 'denied' && !isSubscribed)}
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      >
        {isPending ? '處理中…' : isSubscribed ? '關閉這個裝置的推播' : '開啟這個裝置的推播'}
      </Button>
    </div>
  )
}
