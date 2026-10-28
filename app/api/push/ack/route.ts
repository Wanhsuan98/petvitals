import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { acknowledgeDelivery } from '@/lib/data/push-deliveries'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const ackSchema = z.object({ deliveryId: z.string().uuid() })

// 手機的 Service Worker 收到推播、呼叫顯示通知後回報（見 public/sw.js）。
// 不要求登入：Service Worker 在背景被喚醒時 session 可能已過期，回報會被擋掉，
// 排查時就分不出「手機沒收到」還是「收到了但回報不了」。改以 deliveryId 當憑證——
// 它是隨機 UUID，只出現在加密的推播內容裡，而且這個端點只能把「已收到時間」從空值寫入，
// 不能讀取任何資料。一律回 204，不透露這個 id 是否存在
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = ackSchema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 204 })

  try {
    await acknowledgeDelivery(createServiceRoleClient(), parsed.data.deliveryId)
  } catch (error) {
    console.error('[push] 記錄推播已收到失敗', error)
  }
  return new NextResponse(null, { status: 204 })
}
