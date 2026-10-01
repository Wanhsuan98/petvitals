import type { SupabaseClient } from '@supabase/supabase-js'

import { PushSubscriptionSchema, type PushSubscriptionRecord } from '@/lib/schemas'

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

function toPushSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
  return PushSubscriptionSchema.parse({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: new Date(row.created_at).toISOString()
  })
}

// 用使用者自己的 session 寫（RLS 只讓他寫自己的訂閱）。用 upsert 而非 insert：
// 同一支瀏覽器重新訂閱時 endpoint 通常不變，避免每次都因為 unique 約束而報錯
export async function upsertPushSubscription(
  supabase: SupabaseClient,
  input: { userId: string; endpoint: string; p256dh: string; auth: string }
): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth
    },
    { onConflict: 'endpoint' }
  )

  if (error) throw new Error(`儲存推播訂閱失敗：${error.message}`)
}

export async function deletePushSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string
): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw new Error(`取消推播訂閱失敗：${error.message}`)
}

// 推播 cron job 專用：用 service-role 查，略過 RLS——cron 要幫所有符合條件的使用者發送，
// 不是只查呼叫者自己的訂閱
export async function listPushSubscriptionsForUserIds(
  serviceRoleSupabase: SupabaseClient,
  userIds: string[]
): Promise<PushSubscriptionRecord[]> {
  if (userIds.length === 0) return []

  const { data, error } = await serviceRoleSupabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  if (error) throw new Error(`讀取推播訂閱失敗：${error.message}`)
  return (data as PushSubscriptionRow[]).map(toPushSubscription)
}

// 推播端點回報 404/410 代表瀏覽器那端的訂閱已經失效（例如清除資料、解除安裝 PWA），
// cron job 用 service-role 清掉這筆，避免之後每次都重複發送注定失敗的推播
export async function deletePushSubscriptionById(
  serviceRoleSupabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await serviceRoleSupabase.from('push_subscriptions').delete().eq('id', id)
  if (error) throw new Error(`刪除失效推播訂閱失敗：${error.message}`)
}
