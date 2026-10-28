import { NextResponse } from 'next/server'

import { sendPushToUsers } from '@/lib/push/send'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// 對「自己」所有已訂閱的裝置送一則測試通知，讓使用者自己確認手機收不收得到。
// 伺服器只能知道推播服務（Apple / Google）有沒有收下，手機是否真的顯示只有使用者看得到，
// 這是 Web Push 本身的限制。收件人固定是登入者本人，不接受任何 request body，不能拿來推播給別人
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 發送時要能刪除失效的訂閱，沿用 cron 的 service-role 發送流程；收件人已鎖定為 user.id
  const result = await sendPushToUsers(createServiceRoleClient(), [user.id], {
    title: '🐱 PetVitals 測試通知',
    body: '收到這則通知，代表這個裝置的提醒推播正常運作。'
  })

  return NextResponse.json(result)
}
