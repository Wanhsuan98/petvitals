import { NextResponse, type NextRequest } from 'next/server'

import { listCaregiversForPet } from '@/lib/data/pet-caregivers'
import {
  claimReminderDelivery,
  deleteDeliveriesBefore,
  recordDeliveryOutcome
} from '@/lib/data/push-deliveries'
import { listPushSubscriptionsForUserIds } from '@/lib/data/push-subscriptions'
import { listDueReminders, markReminderSentToday } from '@/lib/data/reminder-schedules'
import type { ReminderSchedule } from '@/lib/schemas'
import { getCronSecret } from '@/lib/push/env'
import { sendToSubscription } from '@/lib/push/send'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const REMINDER_TYPE_LABEL: Record<ReminderSchedule['type'], string> = {
  FLUID: '輸液提醒',
  MEDICATION: '用藥提醒',
  DAILY_LOG: '每日打卡提醒'
}

// 每天清一次 30 天前的投遞紀錄；這個時段 cron 會觸發約 5 次，重複刪除無害
const DELIVERY_CLEANUP_TIME = '03:00'
const DELIVERY_RETENTION_DAYS = 30

// 排程時間只能設 5 分鐘的整數倍，cron-job.org 每 1 分鐘觸發一次，
// 所以把現在時間無條件捨去到最近的 5 分鐘區間：同一個區間內會被觸發約 5 次，
// 失敗的裝置因此最多會被重試約 5 次
function getTaipeiTimeOfDayFlooredToFiveMinutes(now: Date): string {
  const taipeiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const flooredMinutes = Math.floor(taipeiNow.getMinutes() / 5) * 5
  const hh = String(taipeiNow.getHours()).padStart(2, '0')
  const mm = String(flooredMinutes).padStart(2, '0')
  return `${hh}:${mm}`
}

function getTaipeiDateString(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

type ReminderResult = {
  reminderId: string
  deviceCount: number
  delivered: number
  failed: number
  expired: number
  // 這次觸發沒有發送：已經送達、或另一次觸發正在發送
  skipped: number
}

// cron-job.org 每 1 分鐘打一次這個 route（排程設定在 cron-job.org 帳號裡，不在 repo），
// 用 CRON_SECRET 驗證——這個 URL 是公開可觸達的，不像 Vercel Cron 有內建的呼叫端身分驗證。
// 逐台裝置記錄在 push_deliveries：同一則提醒、同一台裝置、同一天只送達一次，失敗的裝置
// 在同一個 5 分鐘區間內的下一次觸發重試。回應帶出每則提醒的明細，cron-job.org 的執行紀錄看得到
export async function GET(request: NextRequest) {
  const expectedSecret = getCronSecret()
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const timeOfDay = getTaipeiTimeOfDayFlooredToFiveMinutes(now)
  const today = getTaipeiDateString(now)

  const serviceRoleSupabase = createServiceRoleClient()
  const dueReminders = await listDueReminders(serviceRoleSupabase, timeOfDay)

  const results: ReminderResult[] = []

  for (const reminder of dueReminders) {
    const reminderId = reminder.id
    if (!reminderId) continue

    const caregivers = await listCaregiversForPet(serviceRoleSupabase, reminder.petId)
    const recipientUserIds = [
      reminder.ownerId,
      ...caregivers.filter((caregiver) => caregiver.status === 'ACCEPTED').map((c) => c.userId)
    ]
    const subscriptions = await listPushSubscriptionsForUserIds(
      serviceRoleSupabase,
      recipientUserIds
    )

    const outcomes = await Promise.all(
      subscriptions.map(async (subscription) => {
        // 單一裝置的資料庫錯誤不能讓其他裝置跟著收不到；沒寫完的 SENDING 紀錄
        // 兩分鐘後會被視為中斷，在同一個區間的後續觸發重試
        try {
          const claim = await claimReminderDelivery(serviceRoleSupabase, {
            reminderId,
            subscription,
            sentOn: today
          })
          if (!claim) return 'SKIPPED' as const

          const outcome = await sendToSubscription(serviceRoleSupabase, subscription, {
            title: `🐱 ${reminder.petName}・${REMINDER_TYPE_LABEL[reminder.type]}`,
            body: reminder.label,
            deliveryId: claim.deliveryId
          })
          await recordDeliveryOutcome(serviceRoleSupabase, claim.deliveryId, outcome)
          return outcome.status
        } catch (error) {
          console.error('[cron] 處理裝置推播失敗', reminderId, subscription.id, error)
          return 'FAILED' as const
        }
      })
    )

    const result: ReminderResult = {
      reminderId,
      deviceCount: subscriptions.length,
      delivered: outcomes.filter((status) => status === 'DELIVERED').length,
      failed: outcomes.filter((status) => status === 'FAILED').length,
      expired: outcomes.filter((status) => status === 'EXPIRED').length,
      skipped: outcomes.filter((status) => status === 'SKIPPED').length
    }
    if (result.failed > 0 || (result.deviceCount === 0 && reminder.lastSentOn !== today)) {
      console.error('[cron] 提醒有裝置未送達', result)
    }
    // last_sent_on 只是摘要（今天至少一台送達過），是否重送改由 push_deliveries 逐台判斷
    if (result.delivered > 0 && reminder.lastSentOn !== today) {
      await markReminderSentToday(serviceRoleSupabase, reminderId, today)
    }
    results.push(result)
  }

  if (timeOfDay === DELIVERY_CLEANUP_TIME) {
    const cutoff = new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 24 * 60 * 60_000)
    await deleteDeliveriesBefore(serviceRoleSupabase, cutoff.toISOString())
  }

  return NextResponse.json({
    ok: true,
    timeOfDay,
    matched: dueReminders.length,
    delivered: results.reduce((sum, result) => sum + result.delivered, 0),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    expired: results.reduce((sum, result) => sum + result.expired, 0),
    skipped: results.reduce((sum, result) => sum + result.skipped, 0),
    results
  })
}
