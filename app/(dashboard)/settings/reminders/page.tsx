import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { listReminderSchedulesForPet } from '@/lib/data/reminder-schedules'
import { getLatestSubscription } from '@/lib/data/subscriptions'
import { createClient } from '@/lib/supabase/server'

import { PushSubscribeToggle } from './push-subscribe-toggle'
import { ReminderScheduleForm } from './reminder-schedule-form'
import { ReminderScheduleList } from './reminder-schedule-list'

// owner 可以管理（新增/啟用停用/刪除），accepted caregiver 只能看跟開啟自己裝置的推播；
// 沒有可存取的貓就導回 /settings 先建檔/等待邀請
export default async function RemindersPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const catProfile = await getCatProfile(supabase, user.id)
  if (!catProfile) redirect('/settings')

  const isOwner = catProfile.ownerId === user.id
  // 協作者不需要自己訂閱——提醒排程能不能用，看的是貓的飼主有沒有訂閱
  const subscription = isOwner ? await getLatestSubscription(supabase, user.id) : null
  const hasActiveSubscription = isOwner ? subscription?.status === 'active' : true

  const schedules = await listReminderSchedulesForPet(supabase, catProfile.id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>推播通知</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSubscribeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isOwner ? '新增提醒排程' : '提醒排程'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && !hasActiveSubscription && (
            <p className="text-sm text-muted-foreground">
              主動提醒排程是訂閱專屬功能，請先到設定頁訂閱後再設定提醒時間。
            </p>
          )}
          {isOwner && hasActiveSubscription && <ReminderScheduleForm />}
          {!isOwner && (
            <p className="text-sm text-muted-foreground">
              提醒排程由飼主設定，這裡僅供查看；開啟上方推播通知後，時間到了就能在這個裝置收到提醒。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>目前的提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <ReminderScheduleList
            schedules={schedules}
            canManage={isOwner && hasActiveSubscription}
          />
        </CardContent>
      </Card>
    </div>
  )
}
