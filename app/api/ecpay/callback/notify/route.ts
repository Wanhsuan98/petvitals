import { NextResponse, type NextRequest } from 'next/server'

import { markSubscriptionPaymentResult } from '@/lib/data/subscriptions'
import { verifyCheckMacValue, type EcpayParams } from '@/lib/ecpay/check-mac-value'
import { getEcpayEnv } from '@/lib/ecpay/env'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ECPay 要求不管處理結果如何都要回應純文字 1|OK，否則會判定失敗並持續重試
// （每 5-15 分鐘一次，每天最多 4 次）。驗證失敗或找不到訂單也一樣要回這個。
function respondOk(): NextResponse {
  return new NextResponse('1|OK', { headers: { 'Content-Type': 'text/plain' } })
}

// ReturnURL：處理「第一次」授權結果的 server-to-server 通知（第二次起走 period-notify）。
// 不管中間任何一步出什麼錯，都一定要回應 1|OK——否則綠界會判定失敗並持續重試，
// body 格式不對、CheckMacValue 驗證失敗、DB 寫入失敗都只記錄 log，絕不能讓例外往外拋。
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params: EcpayParams = {}
    for (const [key, value] of formData.entries()) {
      params[key] = String(value)
    }

    const { hashKey, hashIv } = getEcpayEnv()
    if (!verifyCheckMacValue(params, hashKey, hashIv)) {
      console.error('[ECPay notify] CheckMacValue 驗證失敗', params.MerchantTradeNo)
      return respondOk()
    }

    const merchantTradeNo = params.MerchantTradeNo
    if (!merchantTradeNo) {
      console.error('[ECPay notify] 通知缺少 MerchantTradeNo', params)
      return respondOk()
    }
    const isPaymentSuccessful = params.RtnCode === '1'

    try {
      const supabase = createServiceRoleClient()
      await markSubscriptionPaymentResult(
        supabase,
        merchantTradeNo,
        isPaymentSuccessful ? { succeeded: true, authRef: params.TradeNo } : { succeeded: false }
      )
    } catch (error) {
      console.error('[ECPay notify] 更新訂閱狀態失敗', error)
    }
  } catch (error) {
    console.error('[ECPay notify] 處理通知時發生非預期錯誤', error)
  }

  return respondOk()
}
