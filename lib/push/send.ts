import type { SupabaseClient } from '@supabase/supabase-js'
import webpush, { WebPushError } from 'web-push'

import {
  deletePushSubscriptionById,
  listPushSubscriptionsForUserIds
} from '@/lib/data/push-subscriptions'

import { getPushEnv } from './env'

let isConfigured = false

function ensureConfigured(): void {
  if (isConfigured) return
  const { publicKey, privateKey, subject } = getPushEnv()
  webpush.setVapidDetails(subject, publicKey, privateKey)
  isConfigured = true
}

export type PushPayload = { title: string; body: string }

// 對一群使用者的「所有裝置」嘗試發送推播；單一裝置失敗不影響其他裝置/使用者。
// 遇到 404/410（瀏覽器那端的訂閱已失效，例如清除資料、解除安裝 PWA）就直接刪除該筆，
// 避免之後每次都重複浪費一次注定失敗的推播請求
export async function sendPushToUsers(
  serviceRoleSupabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  ensureConfigured()

  const subscriptions = await listPushSubscriptionsForUserIds(serviceRoleSupabase, userIds)
  const body = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          body
        )
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          if (subscription.id) {
            await deletePushSubscriptionById(serviceRoleSupabase, subscription.id)
          }
          return
        }
        console.error('[push] 發送失敗', subscription.endpoint, error)
      }
    })
  )
}
