import { NextResponse } from 'next/server'

import { createTestDelivery, recordDeliveryOutcome } from '@/lib/data/push-deliveries'
import { listPushSubscriptionsForUserIds } from '@/lib/data/push-subscriptions'
import { sendToSubscription } from '@/lib/push/send'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type TestPushResponse = {
  deviceCount: number
  deliveredCount: number
  failedCount: number
  expiredCount: number
}

// 對「自己」所有已訂閱的裝置送一則測試通知，每台裝置都記一筆 push_deliveries，
// 結果會出現在通知中心的推播紀錄裡（推播服務是否收下、手機是否回報收到）。
// 收件人固定是登入者本人，不接受任何 request body，不能拿來推播給別人
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  // 寫入投遞紀錄與刪除失效訂閱都需要 service-role；收件人已鎖定為 user.id
  const serviceRoleSupabase = createServiceRoleClient()
  const subscriptions = await listPushSubscriptionsForUserIds(serviceRoleSupabase, [user.id])
  const sentOn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })

  const statuses = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const deliveryId = await createTestDelivery(serviceRoleSupabase, { subscription, sentOn })
        const outcome = await sendToSubscription(serviceRoleSupabase, subscription, {
          title: '🐱 PetVitals 測試通知',
          body: '收到這則通知，代表這個裝置的提醒推播正常運作。',
          deliveryId
        })
        await recordDeliveryOutcome(serviceRoleSupabase, deliveryId, outcome)
        return outcome.status
      } catch (error) {
        console.error('[push] 測試通知失敗', subscription.id, error)
        return 'FAILED' as const
      }
    })
  )

  const response: TestPushResponse = {
    deviceCount: subscriptions.length,
    deliveredCount: statuses.filter((status) => status === 'DELIVERED').length,
    failedCount: statuses.filter((status) => status === 'FAILED').length,
    expiredCount: statuses.filter((status) => status === 'EXPIRED').length
  }
  return NextResponse.json(response)
}
