import type { SupabaseClient } from '@supabase/supabase-js'

export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'failed'

export type Subscription = {
  id: string
  ownerId: string
  merchantTradeNo: string
  status: SubscriptionStatus
  periodAmount: number
  periodType: 'D' | 'M' | 'Y'
  frequency: number
  execTimes: number
  totalSuccessTimes: number
  lastPaidAt: string | null
  lastAuthRef: string | null
  createdAt: string
}

type SubscriptionRow = {
  id: string
  owner_id: string
  merchant_trade_no: string
  status: SubscriptionStatus
  period_amount: number
  period_type: 'D' | 'M' | 'Y'
  frequency: number
  exec_times: number
  total_success_times: number
  last_paid_at: string | null
  last_auth_ref: string | null
  created_at: string
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    ownerId: row.owner_id,
    merchantTradeNo: row.merchant_trade_no,
    status: row.status,
    periodAmount: row.period_amount,
    periodType: row.period_type,
    frequency: row.frequency,
    execTimes: row.exec_times,
    totalSuccessTimes: row.total_success_times,
    lastPaidAt: row.last_paid_at ? new Date(row.last_paid_at).toISOString() : null,
    lastAuthRef: row.last_auth_ref,
    createdAt: new Date(row.created_at).toISOString()
  }
}

// 一位使用者可能取消後又重新訂閱，因此可能有多筆歷史紀錄，只取最新一筆代表目前狀態
export async function getLatestSubscription(
  supabase: SupabaseClient,
  ownerId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`讀取訂閱狀態失敗：${error.message}`)
  return data ? toSubscription(data as SubscriptionRow) : null
}

// DB 有一個 partial unique index（owner_id where status in pending/active），
// 併發送出「訂閱」時第二筆 insert 會撞到這個約束，用專屬的 Error 型別讓呼叫端能區分
// 「已經有進行中的訂閱」跟其他真正的失敗原因
export class SubscriptionAlreadyPendingError extends Error {
  constructor() {
    super('已經有進行中的訂閱')
    this.name = 'SubscriptionAlreadyPendingError'
  }
}

export async function createPendingSubscription(
  supabase: SupabaseClient,
  ownerId: string,
  input: {
    merchantTradeNo: string
    periodAmount: number
    periodType: 'D' | 'M' | 'Y'
    frequency: number
    execTimes: number
  }
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      owner_id: ownerId,
      merchant_trade_no: input.merchantTradeNo,
      status: 'pending',
      period_amount: input.periodAmount,
      period_type: input.periodType,
      frequency: input.frequency,
      exec_times: input.execTimes
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new SubscriptionAlreadyPendingError()
    throw new Error(`建立訂閱失敗：${error.message}`)
  }
  return toSubscription(data as SubscriptionRow)
}

// 以下操作只從 webhook（service-role client，略過 RLS）呼叫，
// 安全性由呼叫端先驗證過 CheckMacValue 保證，不是由 RLS 把關

export async function getSubscriptionByMerchantTradeNo(
  supabase: SupabaseClient,
  merchantTradeNo: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('merchant_trade_no', merchantTradeNo)
    .maybeSingle()

  if (error) throw new Error(`讀取訂閱資料失敗：${error.message}`)
  return data ? toSubscription(data as SubscriptionRow) : null
}

// authRef 是這筆授權的唯一識別（首次付款用 TradeNo，第二次起用 Gwsr）。
// ECPay 在沒收到 1|OK 時會重送通知，用 authRef 判斷是否為同一筆授權的重複通知，
// 避免重複計入成功次數。
export async function markSubscriptionPaymentResult(
  supabase: SupabaseClient,
  merchantTradeNo: string,
  result: { succeeded: true; authRef: string } | { succeeded: false }
): Promise<void> {
  if (!result.succeeded) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'failed' })
      .eq('merchant_trade_no', merchantTradeNo)
    if (error) throw new Error(`更新訂閱狀態失敗：${error.message}`)
    return
  }

  const existing = await getSubscriptionByMerchantTradeNo(supabase, merchantTradeNo)
  if (existing?.lastAuthRef === result.authRef) return // 重複通知，已處理過，略過避免重複計次

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      total_success_times: (existing?.totalSuccessTimes ?? 0) + 1,
      last_paid_at: new Date().toISOString(),
      last_auth_ref: result.authRef
    })
    .eq('merchant_trade_no', merchantTradeNo)
  if (error) throw new Error(`更新訂閱狀態失敗：${error.message}`)
}

export async function cancelSubscription(
  supabase: SupabaseClient,
  merchantTradeNo: string
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('merchant_trade_no', merchantTradeNo)
  if (error) throw new Error(`取消訂閱失敗：${error.message}`)
}
