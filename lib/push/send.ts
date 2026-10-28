import type { SupabaseClient } from '@supabase/supabase-js'
import webpush, { WebPushError } from 'web-push'

import type { PushDeliveryOutcome } from '@/lib/data/push-deliveries'
import { deletePushSubscriptionById } from '@/lib/data/push-subscriptions'
import type { PushSubscriptionRecord } from '@/lib/schemas'

import { getPushEnv } from './env'

let isConfigured = false

function ensureConfigured(): void {
  if (isConfigured) return
  const { publicKey, privateKey, subject } = getPushEnv()
  webpush.setVapidDetails(subject, publicKey, privateKey)
  isConfigured = true
}

// deliveryId 讓手機的 Service Worker 收到後回報（POST /api/push/ack），
// 才能分辨「推播服務收下了但手機沒收到」與「手機收到了但系統沒顯示」
export type PushPayload = { title: string; body: string; deliveryId: string }

function describeError(error: unknown): string {
  if (error instanceof WebPushError) return error.body || error.message
  return error instanceof Error ? error.message : String(error)
}

// 對單一裝置發送一則推播，回傳推播服務（Apple / Google / Mozilla）的結果。
// DELIVERED 代表推播服務收下了，不保證手機有顯示，手機是否收到要看 Service Worker 的回報。
// 遇到 404/410（瀏覽器那端的訂閱已失效，例如清除資料、解除安裝 PWA）就直接刪除該筆訂閱，
// 避免之後每次都重複浪費一次注定失敗的推播請求
export async function sendToSubscription(
  serviceRoleSupabase: SupabaseClient,
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<PushDeliveryOutcome> {
  ensureConfigured()

  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      },
      JSON.stringify(payload)
    )
    return { status: 'DELIVERED', statusCode: result.statusCode, errorMessage: null }
  } catch (error) {
    const statusCode = error instanceof WebPushError ? error.statusCode : null
    if (statusCode === 404 || statusCode === 410) {
      if (subscription.id) await deletePushSubscriptionById(serviceRoleSupabase, subscription.id)
      return { status: 'EXPIRED', statusCode, errorMessage: describeError(error) }
    }
    console.error('[push] 發送失敗', subscription.id, statusCode, describeError(error))
    return { status: 'FAILED', statusCode, errorMessage: describeError(error) }
  }
}
