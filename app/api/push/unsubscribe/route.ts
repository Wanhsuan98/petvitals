import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { deletePushSubscriptionByEndpoint } from '@/lib/data/push-subscriptions'
import { createClient } from '@/lib/supabase/server'

const unsubscribeSchema = z.object({ endpoint: z.string().url() })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = unsubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '請求格式有誤' }, { status: 400 })
  }

  try {
    // RLS 只讓使用者刪除 user_id = auth.uid() 的那幾筆，這裡不用再額外比對 endpoint 的擁有者
    await deletePushSubscriptionByEndpoint(supabase, parsed.data.endpoint)
  } catch (error) {
    console.error('[push/unsubscribe] 刪除失敗', error)
    return NextResponse.json({ error: '取消推播訂閱失敗' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
