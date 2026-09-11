import { NextResponse } from 'next/server'

import { generateCheckMacValue, type EcpayParams } from '@/lib/ecpay/check-mac-value'
import { buildAioCheckoutHtml } from '@/lib/ecpay/checkout-form'
import { ECPAY_AIO_CHECKOUT_URL, getEcpayEnv } from '@/lib/ecpay/env'
import { formatMerchantTradeDate } from '@/lib/ecpay/trade-date'
import {
  createPendingSubscription,
  getLatestSubscription,
  SubscriptionAlreadyPendingError
} from '@/lib/data/subscriptions'
import { getSiteOrigin } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'

const SUBSCRIPTION_PRICE_TWD = 199

function generateMerchantTradeNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).slice(2, 6)
  return `Sub${timestamp}${random}`.slice(0, 20)
}

// 使用者送出「訂閱」表單後打這個 route：建立一筆 pending 訂閱紀錄，
// 回傳一個會自動送出的 HTML 表單，把瀏覽器帶去綠界的收銀台頁面。
//
// 用 POST 而非 GET：建立訂閱是有副作用的操作，掛在 GET 上會被瀏覽器連結預先載入、
// 掃毒軟體的連結預先掃描等機制意外觸發，top-level GET navigation 也不受 SameSite=Lax
// cookie 限制，等於是個 CSRF 入口——攻擊者的頁面放一個連過來的連結就能讓已登入使用者
// 在不知情下建立訂閱請求。
export async function POST() {
  const origin = await getSiteOrigin()
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin), { status: 303 })
  }

  const existing = await getLatestSubscription(supabase, user.id)
  if (existing?.status === 'active' || existing?.status === 'pending') {
    return NextResponse.redirect(new URL('/settings', origin), { status: 303 })
  }

  const merchantTradeNo = generateMerchantTradeNo()
  try {
    await createPendingSubscription(supabase, user.id, {
      merchantTradeNo,
      periodAmount: SUBSCRIPTION_PRICE_TWD,
      periodType: 'M',
      frequency: 1,
      execTimes: 999 // 訂到使用者主動取消為止（M 週期上限），非固定期數方案
    })
  } catch (error) {
    if (error instanceof SubscriptionAlreadyPendingError) {
      // 併發送出訂閱表單時，DB 的 partial unique index 會擋下第二筆，當成「已有進行中訂閱」處理
      return NextResponse.redirect(new URL('/settings', origin), { status: 303 })
    }
    throw error
  }

  const { merchantId, hashKey, hashIv } = getEcpayEnv()

  const params: EcpayParams = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(new Date()),
    PaymentType: 'aio',
    TotalAmount: String(SUBSCRIPTION_PRICE_TWD),
    TradeDesc: 'PetVitals 月訂閱方案',
    ItemName: 'PetVitals 月訂閱 x1',
    ReturnURL: `${origin}/api/ecpay/callback/notify`,
    OrderResultURL: `${origin}/api/ecpay/order-result`,
    ChoosePayment: 'Credit',
    EncryptType: '1',
    PeriodAmount: String(SUBSCRIPTION_PRICE_TWD),
    PeriodType: 'M',
    Frequency: '1',
    ExecTimes: '999',
    PeriodReturnURL: `${origin}/api/ecpay/callback/period-notify`
  }
  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIv)

  const html = buildAioCheckoutHtml(ECPAY_AIO_CHECKOUT_URL, params)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
