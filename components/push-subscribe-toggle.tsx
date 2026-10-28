'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getReadyServiceWorker, urlBase64ToUint8Array } from '@/lib/push/browser'

type SupportStatus = 'checking' | 'unsupported' | 'supported' | 'error'

const PERMISSION_NOT_GRANTED_MESSAGE = '尚未允許通知權限，請再按一次並在詢問視窗選擇「允許」'

// 先撤銷瀏覽器端（這才是「是否還會收到推播」的事實）。之後伺服器刪除若失敗，殘留的憑證
// 會在下次推播收到 404/410 時被 lib/push/send.ts 自動清掉；反過來先刪伺服器的話，
// 失敗會留下「畫面顯示已開啟、伺服器卻沒有紀錄」的不一致
async function removeSubscription(subscription: PushSubscription): Promise<void> {
  const { endpoint } = subscription
  const isUnsubscribed = await subscription.unsubscribe()
  if (!isUnsubscribed) throw new Error('瀏覽器取消推播訂閱失敗')

  const response = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint })
  })
  if (!response.ok) console.error('[push] 伺服器端刪除訂閱失敗，等待推播時自動清理')
}

export type TestPushResult = {
  deviceCount: number
  deliveredCount: number
  failedCount: number
  expiredCount: number
}

export function describeTestResult(result: TestPushResult): string {
  if (result.deliveredCount === 0) {
    return '測試通知沒有送出成功。請先關閉這個裝置的推播，再重新開啟一次'
  }
  // 部分裝置失敗時也要說出來，不然使用者看到「已送出」會以為每台都沒問題
  const notDeliveredCount = result.failedCount + result.expiredCount
  const notDeliveredText = notDeliveredCount > 0 ? `，另有 ${notDeliveredCount} 台沒送出` : ''
  return `已送出到 ${result.deliveredCount} 台裝置${notDeliveredText}。如果沒看到通知，幾秒後重新整理本頁，「最近推播紀錄」會顯示可能的原因`
}

// 傳送測試通知：伺服器只能確認推播服務收下了，手機有沒有真的跳出通知只有使用者看得到
function TestPushButton() {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()

  async function handleSendTest() {
    setIsSending(true)
    setMessage(null)
    try {
      if (!navigator.onLine) {
        setMessage('目前沒有網路連線，請連線後再試')
        return
      }
      const response = await fetch('/api/push/test', { method: 'POST' })
      if (!response.ok) throw new Error('測試通知請求失敗')
      setMessage(describeTestResult((await response.json()) as TestPushResult))
      // 讓通知中心的推播紀錄顯示剛才這筆；手機的「已收到」回報會晚幾秒才到
      router.refresh()
    } catch {
      setMessage('傳送測試通知失敗，請稍後再試')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button variant="ghost" size="sm" disabled={isSending} onClick={handleSendTest}>
        {isSending ? '傳送中…' : '傳送測試通知'}
      </Button>
      {/* 測試通知會送到帳號下所有裝置，不只這一台；按鈕放在「本裝置推播」卡片裡，不說清楚會被誤會。
          「先回到主畫面」是因為 App 開在前景時系統不一定會跳出橫幅（實測離開 App 後會跳出） */}
      <p className="text-xs text-muted-foreground">
        會傳一則測試通知到你帳號下所有已開啟推播的裝置。按下後可以先回到主畫面，幾秒內應該會收到；如果沒收到，請到系統設定確認
        PetVitals 允許通知，並檢查專注模式／勿擾模式。
      </p>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}

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
      const currentPermission = Notification.permission

      let hasActiveSubscription = existing !== null
      if (existing && currentPermission === 'denied') {
        // 已開啟後才到系統設定封鎖通知：這筆訂閱已經收不到通知，留著只會讓按鈕顯示「關閉」、
        // 跟封鎖說明互相矛盾。清掉後畫面回到「未開啟」，使用者重新允許後再開啟即可
        await removeSubscription(existing).catch((cleanupError: unknown) => {
          console.error('[push] 清除權限已被封鎖的訂閱失敗', cleanupError)
        })
        hasActiveSubscription = false
      }

      if (cancelled || mutationVersionRef.current !== versionAtStart) return
      setIsSubscribed(hasActiveSubscription)
      setPermission(currentPermission)
      // 使用者到系統設定允許通知後回來，先前「尚未允許」的提示已經不成立
      if (currentPermission === 'granted') {
        setError((previous) => (previous === PERMISSION_NOT_GRANTED_MESSAGE ? null : previous))
      }
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
      // 離線時 pushManager.subscribe() 不會失敗而是一直等網路，畫面會卡在「處理中…」
      if (!navigator.onLine) {
        setError('目前沒有網路連線，請連線後再開啟推播')
        return
      }

      const requestedPermission = await Notification.requestPermission()
      // 以 Notification.permission 為準顯示：iOS 的權限視窗被切換 App 打斷時，
      // requestPermission() 可能回傳 denied，但系統實際儲存的仍是「尚未決定」
      const currentPermission = Notification.permission
      setPermission(currentPermission)
      if (requestedPermission !== 'granted') {
        // 真的被封鎖時，畫面上的封鎖說明已經足夠，不重複顯示紅字
        if (currentPermission !== 'denied') setError(PERMISSION_NOT_GRANTED_MESSAGE)
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
      if (subscription) await removeSubscription(subscription)
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
          本裝置的通知權限已被封鎖，請先到瀏覽器或系統設定允許通知，回到這裡後再開啟推播。
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
      {isSubscribed && permission === 'granted' && !isPending && <TestPushButton />}
    </div>
  )
}
