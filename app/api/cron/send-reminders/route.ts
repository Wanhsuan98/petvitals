import { NextResponse, type NextRequest } from 'next/server'

import { listCaregiversForPet } from '@/lib/data/pet-caregivers'
import { listDueReminders, markReminderSentToday } from '@/lib/data/reminder-schedules'
import type { ReminderSchedule } from '@/lib/schemas'
import { getCronSecret } from '@/lib/push/env'
import { sendPushToUsers } from '@/lib/push/send'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const REMINDER_TYPE_LABEL: Record<ReminderSchedule['type'], string> = {
  FLUID: '輸液提醒',
  MEDICATION: '用藥提醒',
  DAILY_LOG: '每日打卡提醒'
}

// 排程時間只能設 5 分鐘的整數倍，cron-job.org 每 1 分鐘觸發一次，
// 所以把現在時間無條件捨去到最近的 5 分鐘區間：同一個區間內會被觸發約 5 次
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

// cron-job.org 每 1 分鐘打一次這個 route（排程設定在 cron-job.org 帳號裡，不在 repo），
// 用 CRON_SECRET 驗證——這個 URL 是公開可觸達的，不像 Vercel Cron 有內建的呼叫端身分驗證。
// 回應會帶出每則提醒的送達/失敗數，cron-job.org 的執行紀錄看得到回應內容，方便排查
type ReminderResult = {
  reminderId: string
  deviceCount: number
  deliveredCount: number
  failedCount: number
  expiredCount: number
  isMarkedSent: boolean
}
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
    if (!reminder.id || reminder.lastSentOn === today) continue

    const caregivers = await listCaregiversForPet(serviceRoleSupabase, reminder.petId)
    const recipientUserIds = [
      reminder.ownerId,
      ...caregivers.filter((caregiver) => caregiver.status === 'ACCEPTED').map((c) => c.userId)
    ]

    const sendResult = await sendPushToUsers(serviceRoleSupabase, recipientUserIds, {
      title: `🐱 ${reminder.petName}・${REMINDER_TYPE_LABEL[reminder.type]}`,
      body: reminder.label
    })

    // 至少一個裝置被推播服務接受才標記今天已發送。全部失敗（或沒有任何裝置）就不標記，
    // 同一個 5 分鐘區間內的下一次觸發會自動重試；以前不論結果都標記，失敗就整天收不到也查不出來
    const isMarkedSent = sendResult.deliveredCount > 0
    if (isMarkedSent) {
      await markReminderSentToday(serviceRoleSupabase, reminder.id, today)
    } else {
      console.error('[cron] 提醒沒有任何裝置送達，不標記已發送', reminder.id, sendResult)
    }
    results.push({ reminderId: reminder.id, ...sendResult, isMarkedSent })
  }

  return NextResponse.json({
    ok: true,
    timeOfDay,
    matched: dueReminders.length,
    sent: results.filter((result) => result.isMarkedSent).length,
    delivered: results.reduce((sum, result) => sum + result.deliveredCount, 0),
    failed: results.reduce((sum, result) => sum + result.failedCount, 0),
    expired: results.reduce((sum, result) => sum + result.expiredCount, 0),
    results
  })
}
