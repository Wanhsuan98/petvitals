'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { saveCatProfile } from '@/lib/data/cat-profile'
import {
  cancelSubscription,
  getLatestSubscription,
  markSubscriptionPaymentResult
} from '@/lib/data/subscriptions'
import { cancelEcpayPeriodOrder } from '@/lib/ecpay/period-action'
import { queryEcpayPeriodTrade } from '@/lib/ecpay/query-period-trade'
import { CatProfileSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('signOut failed:', error.message)
  }
  redirect('/login')
}

const catProfileInputSchema = CatProfileSchema.omit({ id: true, ownerId: true, createdAt: true })
export type CatProfileFormInput = z.input<typeof catProfileInputSchema>
export type CatProfileFormOutput = z.output<typeof catProfileInputSchema>

export type SaveCatProfileState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function saveCatProfileAction(
  _prevState: SaveCatProfileState,
  input: CatProfileFormOutput
): Promise<SaveCatProfileState> {
  const parsed = catProfileInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: '資料格式有誤，請確認欄位內容後再試一次' }
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: '登入狀態已過期，請重新登入' }
  }

  try {
    await saveCatProfile(supabase, user.id, parsed.data)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '儲存失敗，請稍後再試'
    }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/log')
  revalidatePath('/records')

  return { status: 'success', message: '已儲存貓咪資料' }
}

export type CancelSubscriptionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

// prevState 沒有實際用到，但 useActionState 呼叫 action 時一定會帶入這個參數，簽章需要保留
export async function cancelSubscriptionAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: CancelSubscriptionState
): Promise<CancelSubscriptionState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: '登入狀態已過期，請重新登入' }
  }

  // 用使用者自己的 session 找出「他自己的」訂閱（RLS 保證只查得到自己的），確認身分/所有權
  const subscription = await getLatestSubscription(supabase, user.id)
  if (!subscription || (subscription.status !== 'active' && subscription.status !== 'pending')) {
    return { status: 'error', message: '目前沒有可以取消的訂閱' }
  }

  try {
    // pending 代表從未成功完成第一次付款，綠界那邊沒有真正生效的定期定額可以取消，
    // 只有 active（已經扣款成功過）才需要真的呼叫綠界的取消 API
    if (subscription.status === 'active') {
      const result = await cancelEcpayPeriodOrder(subscription.merchantTradeNo)
      if (!result.success) {
        return { status: 'error', message: `取消訂閱失敗：${result.message || '請稍後再試'}` }
      }
    }

    // 確認綠界那邊真的取消成功後，才用 service-role 寫回狀態（一般使用者沒有 UPDATE 權限）
    const serviceRoleSupabase = createServiceRoleClient()
    await cancelSubscription(serviceRoleSupabase, subscription.merchantTradeNo)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '取消訂閱失敗，請稍後再試'
    }
  }

  revalidatePath('/settings')

  return {
    status: 'success',
    message:
      subscription.status === 'pending'
        ? '已放棄這筆未完成的訂閱，可以重新訂閱'
        : '已取消訂閱，本期結束後不會再扣款'
  }
}

export type RefreshSubscriptionState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

// webhook（ReturnURL/PeriodReturnURL）理論上會自動更新狀態，但網路狀況、tunnel 網址中途
// 更換等因素可能導致通知沒送達。這裡提供官方文件建議的備援：直接呼叫「定期定額訂單查詢」
// API 跟綠界核對實際授權結果，不需要乾等 webhook。
export async function refreshSubscriptionStatusAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: RefreshSubscriptionState
): Promise<RefreshSubscriptionState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: '登入狀態已過期，請重新登入' }
  }

  const subscription = await getLatestSubscription(supabase, user.id)
  if (!subscription || subscription.status === 'cancelled' || subscription.status === 'failed') {
    return { status: 'error', message: '目前沒有需要查詢的訂閱' }
  }

  try {
    const result = await queryEcpayPeriodTrade(subscription.merchantTradeNo)
    const serviceRoleSupabase = createServiceRoleClient()

    if (result.rtnCode === 1 && result.totalSuccessTimes > 0 && result.latestGwsr) {
      await markSubscriptionPaymentResult(serviceRoleSupabase, subscription.merchantTradeNo, {
        succeeded: true,
        authRef: result.latestGwsr
      })
      revalidatePath('/settings')
      return { status: 'success', message: '已依綠界最新資料更新為訂閱中' }
    }

    if (result.execStatus === '0') {
      await cancelSubscription(serviceRoleSupabase, subscription.merchantTradeNo)
      revalidatePath('/settings')
      return { status: 'success', message: '綠界那邊顯示這筆訂閱已終止' }
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '查詢失敗，請稍後再試'
    }
  }

  return { status: 'success', message: '綠界目前還沒有成功授權紀錄，狀態維持不變' }
}
