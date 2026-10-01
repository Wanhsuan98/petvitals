import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { upsertPushSubscription } from '@/lib/data/push-subscriptions'
import { createClient } from '@/lib/supabase/server'

// 對應瀏覽器 PushSubscription.toJSON() 的形狀
const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '推播訂閱資料格式有誤' }, { status: 400 })
  }

  try {
    await upsertPushSubscription(supabase, {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth
    })
  } catch (error) {
    console.error('[push/subscribe] 儲存失敗', error)
    return NextResponse.json({ error: '儲存推播訂閱失敗' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
