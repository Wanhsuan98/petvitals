import type { SupabaseClient } from '@supabase/supabase-js'

import type { PushSubscriptionRecord } from '@/lib/schemas'

export type PushDeliveryKind = 'REMINDER' | 'TEST'
export type PushDeliveryStatus = 'SENDING' | 'DELIVERED' | 'FAILED' | 'EXPIRED'

export type PushDeliveryOutcome = {
  status: Exclude<PushDeliveryStatus, 'SENDING'>
  statusCode: number | null
  errorMessage: string | null
}

export type PushDelivery = {
  id: string
  kind: PushDeliveryKind
  status: PushDeliveryStatus
  attemptCount: number
  statusCode: number | null
  errorMessage: string | null
  endpointHost: string | null
  subscriptionCreatedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  reminderLabel: string | null
}

type PushDeliveryRow = {
  id: string
  kind: PushDeliveryKind
  status: PushDeliveryStatus
  attempt_count: number
  status_code: number | null
  error_message: string | null
  endpoint_host: string | null
  subscription_created_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
  reminder_schedules: { label: string } | null
}

// SENDING 超過這個時間還沒有結果，視為上一次執行中途中斷（例如函式逾時），允許重新搶這一列
const STALE_SENDING_MS = 2 * 60_000
const MAX_ERROR_MESSAGE_LENGTH = 300

function toIso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null
}

function toPushDelivery(row: PushDeliveryRow): PushDelivery {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    attemptCount: row.attempt_count,
    statusCode: row.status_code,
    errorMessage: row.error_message,
    endpointHost: row.endpoint_host,
    subscriptionCreatedAt: toIso(row.subscription_created_at),
    receivedAt: toIso(row.received_at),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    reminderLabel: row.reminder_schedules?.label ?? null
  }
}

// 只存主機名稱：完整 endpoint 等同推播憑證，不該出現在紀錄或畫面上
function getEndpointHost(endpoint: string): string | null {
  try {
    return new URL(endpoint).hostname
  } catch {
    return null
  }
}

function baseRow(subscription: PushSubscriptionRecord, sentOn: string) {
  return {
    user_id: subscription.userId,
    subscription_id: subscription.id ?? null,
    sent_on: sentOn,
    status: 'SENDING' as const,
    endpoint_host: getEndpointHost(subscription.endpoint),
    subscription_created_at: subscription.createdAt ?? null
  }
}

// 搶下「這則提醒、這台裝置、今天」的投遞權。回傳 null 代表不用發送：
// 已經送達、或另一次 cron 觸發正在發送。失敗過的會被重新搶下來重試（attempt_count + 1）。
// 第一次用 insert ... on conflict do nothing，之後用「狀態與次數都沒變才更新」的條件式 update，
// 兩者都是單一 SQL 敘述，兩次 cron 觸發重疊時只有一次會搶到
export async function claimReminderDelivery(
  serviceRoleSupabase: SupabaseClient,
  input: { reminderId: string; subscription: PushSubscriptionRecord; sentOn: string }
): Promise<{ deliveryId: string; attemptCount: number } | null> {
  const subscriptionId = input.subscription.id
  // 從資料庫讀出來的訂閱一定有 id；沒有的話無法對應唯一約束，也就無法避免重複推播
  if (!subscriptionId) throw new Error('推播訂閱缺少 id，無法建立投遞紀錄')

  const { data: inserted, error: insertError } = await serviceRoleSupabase
    .from('push_deliveries')
    .upsert(
      {
        ...baseRow(input.subscription, input.sentOn),
        kind: 'REMINDER',
        reminder_id: input.reminderId
      },
      { onConflict: 'reminder_id,subscription_id,sent_on', ignoreDuplicates: true }
    )
    .select('id')

  if (insertError) throw new Error(`建立推播紀錄失敗：${insertError.message}`)
  if (inserted && inserted.length > 0) {
    return { deliveryId: (inserted[0] as { id: string }).id, attemptCount: 1 }
  }

  const { data: existing, error: readError } = await serviceRoleSupabase
    .from('push_deliveries')
    .select('id, status, attempt_count, updated_at')
    .eq('reminder_id', input.reminderId)
    .eq('subscription_id', subscriptionId)
    .eq('sent_on', input.sentOn)
    .maybeSingle()

  if (readError) throw new Error(`讀取推播紀錄失敗：${readError.message}`)
  if (!existing) return null

  const row = existing as {
    id: string
    status: PushDeliveryStatus
    attempt_count: number
    updated_at: string
  }
  const isStaleSending =
    row.status === 'SENDING' && Date.now() - new Date(row.updated_at).getTime() > STALE_SENDING_MS
  if (row.status !== 'FAILED' && !isStaleSending) return null

  const nextAttempt = row.attempt_count + 1
  const { data: claimed, error: claimError } = await serviceRoleSupabase
    .from('push_deliveries')
    .update({
      status: 'SENDING',
      attempt_count: nextAttempt,
      updated_at: new Date().toISOString()
    })
    .eq('id', row.id)
    .eq('status', row.status)
    .eq('attempt_count', row.attempt_count)
    .select('id')

  if (claimError) throw new Error(`更新推播紀錄失敗：${claimError.message}`)
  return claimed && claimed.length > 0 ? { deliveryId: row.id, attemptCount: nextAttempt } : null
}

// 測試通知每按一次就新增一列，不跟提醒共用「一天一次」的限制
export async function createTestDelivery(
  serviceRoleSupabase: SupabaseClient,
  input: { subscription: PushSubscriptionRecord; sentOn: string }
): Promise<string> {
  const { data, error } = await serviceRoleSupabase
    .from('push_deliveries')
    .insert({ ...baseRow(input.subscription, input.sentOn), kind: 'TEST' })
    .select('id')
    .single()

  if (error) throw new Error(`建立測試推播紀錄失敗：${error.message}`)
  return (data as { id: string }).id
}

export async function recordDeliveryOutcome(
  serviceRoleSupabase: SupabaseClient,
  deliveryId: string,
  outcome: PushDeliveryOutcome
): Promise<void> {
  const { error } = await serviceRoleSupabase
    .from('push_deliveries')
    .update({
      status: outcome.status,
      status_code: outcome.statusCode,
      error_message: outcome.errorMessage?.slice(0, MAX_ERROR_MESSAGE_LENGTH) ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('id', deliveryId)

  if (error) throw new Error(`更新推播結果失敗：${error.message}`)
}

// 手機的 Service Worker 收到推播並顯示通知後回報。只寫第一次，重複回報不覆蓋時間
export async function acknowledgeDelivery(
  serviceRoleSupabase: SupabaseClient,
  deliveryId: string
): Promise<void> {
  const { error } = await serviceRoleSupabase
    .from('push_deliveries')
    .update({ received_at: new Date().toISOString() })
    .eq('id', deliveryId)
    .is('received_at', null)

  if (error) throw new Error(`記錄推播已收到失敗：${error.message}`)
}

// 用使用者自己的 session 查（RLS 只讓本人讀自己的紀錄），給通知中心的推播紀錄使用
export async function listRecentDeliveriesForUser(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<PushDelivery[]> {
  const { data, error } = await supabase
    .from('push_deliveries')
    .select('*, reminder_schedules(label)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`讀取推播紀錄失敗：${error.message}`)
  return (data as PushDeliveryRow[]).map(toPushDelivery)
}

// 紀錄只為了排查近期問題，保留 30 天；由 cron 每天清一次
export async function deleteDeliveriesBefore(
  serviceRoleSupabase: SupabaseClient,
  beforeIso: string
): Promise<void> {
  const { error } = await serviceRoleSupabase
    .from('push_deliveries')
    .delete()
    .lt('created_at', beforeIso)

  if (error) throw new Error(`清除舊推播紀錄失敗：${error.message}`)
}
