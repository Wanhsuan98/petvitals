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

// 排程時間只到分鐘，且 GitHub Actions 的 schedule 本身就有幾分鐘的誤差，
// 所以把現在時間無條件捨去到最近的 5 分鐘區間，跟每隔 5 分鐘觸發一次的排程對齊
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

// GitHub Actions 排程每 5 分鐘打一次這個 route（見 .github/workflows/send-reminders.yml），
// 用 CRON_SECRET 驗證——這個 URL 現在是公開可觸達的，不像 Vercel Cron 有內建的呼叫端身分驗證
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

  let sentCount = 0

  for (const reminder of dueReminders) {
    if (!reminder.id || reminder.lastSentOn === today) continue

    const caregivers = await listCaregiversForPet(serviceRoleSupabase, reminder.petId)
    const recipientUserIds = [
      reminder.ownerId,
      ...caregivers.filter((caregiver) => caregiver.status === 'ACCEPTED').map((c) => c.userId)
    ]

    await sendPushToUsers(serviceRoleSupabase, recipientUserIds, {
      title: `🐱 ${reminder.petName}・${REMINDER_TYPE_LABEL[reminder.type]}`,
      body: reminder.label
    })

    await markReminderSentToday(serviceRoleSupabase, reminder.id, today)
    sentCount += 1
  }

  return NextResponse.json({ ok: true, timeOfDay, matched: dueReminders.length, sent: sentCount })
}
