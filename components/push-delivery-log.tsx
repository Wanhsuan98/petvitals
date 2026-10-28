import type { PushDelivery } from '@/lib/data/push-deliveries'

const PUSH_SERVICE_LABEL: Record<string, string> = {
  'web.push.apple.com': 'Apple 裝置',
  'fcm.googleapis.com': 'Android／Chrome',
  'updates.push.services.mozilla.com': 'Firefox'
}

// 伺服器在 UTC 執行，時間一律明確轉成台灣時間顯示，避免伺服器與裝置時區不一致
function formatTaipeiTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function formatTaipeiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric'
  })
}

function describeDevice(delivery: PushDelivery): string {
  const service = delivery.endpointHost
    ? (PUSH_SERVICE_LABEL[delivery.endpointHost] ?? delivery.endpointHost)
    : '未知裝置'
  return delivery.subscriptionCreatedAt
    ? `${service}（${formatTaipeiDate(delivery.subscriptionCreatedAt)} 開啟推播）`
    : service
}

type Diagnosis = { label: string; detail: string; tone: 'ok' | 'warn' | 'error' }

// 三層狀態各自對應不同的排查方向：推播服務拒收 → 看錯誤原因；
// 推播服務收下但手機沒回報 → 這個訂閱多半已不再對應手機上的 App；手機回報收到 → 看系統通知設定
export function diagnoseDelivery(delivery: PushDelivery): Diagnosis {
  const code = delivery.statusCode ? `（${delivery.statusCode}）` : ''
  if (delivery.status === 'SENDING') {
    return { label: '傳送中', detail: '這次傳送還沒有結果。', tone: 'warn' }
  }
  if (delivery.status === 'EXPIRED') {
    return {
      label: `訂閱已失效${code}`,
      detail: '推播服務表示這個訂閱已不存在，系統已自動移除。請在這台裝置重新開啟推播。',
      tone: 'error'
    }
  }
  if (delivery.status === 'FAILED') {
    return {
      label: `推播服務拒收${code}`,
      detail: delivery.errorMessage ?? '推播服務沒有提供原因。',
      tone: 'error'
    }
  }
  if (delivery.receivedAt) {
    return {
      label: `手機已收到（${formatTaipeiTime(delivery.receivedAt)}）`,
      detail:
        '手機收到並已顯示通知。如果仍然沒看到，請檢查系統設定裡 PetVitals 的通知權限與專注模式。',
      tone: 'ok'
    }
  }
  return {
    label: '推播服務已收下，手機沒有回報收到',
    detail:
      '常見原因：PetVitals 從主畫面刪除後重新加入，舊訂閱已不再對應手機上的 App；或手機長時間離線、低電量模式。可以在這台裝置關閉再重新開啟推播。',
    tone: 'warn'
  }
}

const TONE_CLASS: Record<Diagnosis['tone'], string> = {
  ok: 'text-primary',
  warn: 'text-accent-text',
  error: 'text-destructive'
}

export function PushDeliveryLog({ deliveries }: { deliveries: PushDelivery[] }) {
  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        還沒有推播紀錄。開啟推播後按「傳送測試通知」，或等提醒時間到，就會出現在這裡。
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {deliveries.map((delivery) => {
        const diagnosis = diagnoseDelivery(delivery)
        return (
          <li key={delivery.id} className="space-y-1 rounded-2xl bg-input p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">
                {delivery.kind === 'TEST' ? '測試通知' : (delivery.reminderLabel ?? '提醒')}
              </p>
              <time
                dateTime={delivery.createdAt}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatTaipeiTime(delivery.createdAt)}
              </time>
            </div>
            <p className="text-xs text-muted-foreground">
              {describeDevice(delivery)}
              {delivery.attemptCount > 1 ? `・嘗試 ${delivery.attemptCount} 次` : ''}
            </p>
            <p className={`text-xs font-medium ${TONE_CLASS[diagnosis.tone]}`}>{diagnosis.label}</p>
            <p className="text-xs text-muted-foreground">{diagnosis.detail}</p>
          </li>
        )
      })}
    </ul>
  )
}
