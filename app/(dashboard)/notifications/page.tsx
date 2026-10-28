import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/page-header'
import { PendingInvitationsSection } from '@/components/pending-invitations-section'
import { PushDeliveryLog } from '@/components/push-delivery-log'
import { PushSubscribeToggle } from '@/components/push-subscribe-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { listPendingInvitationsForUser } from '@/lib/data/pet-caregivers'
import { listRecentDeliveriesForUser, type PushDelivery } from '@/lib/data/push-deliveries'
import { createClient } from '@/lib/supabase/server'

import { RefreshNotificationsButton } from './refresh-notifications-button'

// 推播紀錄只是排查用的輔助資訊：讀取失敗時顯示空清單，不能讓邀請與推播開關跟著整頁壞掉
async function getRecentDeliveries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<PushDelivery[] | null> {
  try {
    return await listRecentDeliveriesForUser(supabase, userId)
  } catch (error) {
    console.error('讀取推播紀錄失敗', error)
    return null
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [invitations, catProfile, deliveries] = await Promise.all([
    listPendingInvitationsForUser(supabase, user.id),
    getCatProfile(supabase, user.id),
    getRecentDeliveries(supabase, user.id)
  ])

  return (
    <div className="space-y-4">
      <PageHeader title="通知中心" backHref={catProfile ? '/' : '/settings'} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">查看邀請與本裝置的推播設定。</p>
        <RefreshNotificationsButton />
      </div>
      <PendingInvitationsSection invitations={invitations} showEmpty />
      <Card>
        <CardHeader>
          <CardTitle>本裝置推播</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PushSubscribeToggle />
          <p className="text-xs text-muted-foreground">
            推播開關僅適用於這個裝置；通知能否送達仍受網路與系統設定影響。
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>最近推播紀錄</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            你帳號下所有裝置最近 10 筆推播（保留 30 天），用來確認提醒有沒有送到手機。
          </p>
          {deliveries ? (
            <PushDeliveryLog deliveries={deliveries} />
          ) : (
            <p role="alert" className="text-sm text-destructive">
              暫時無法讀取推播紀錄，請稍後重新整理。
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>提醒設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {catProfile ? (
            <>
              <p className="text-sm text-muted-foreground">
                {catProfile.ownerId === user.id
                  ? `管理 ${catProfile.name} 的輸液、用藥與每日打卡提醒。`
                  : `${catProfile.name} 的提醒由飼主設定，你可以查看排程並開啟本裝置推播。`}
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/settings/reminders" />}
              >
                查看提醒排程
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                先建立貓咪資料或接受協作邀請，就能查看提醒排程。
              </p>
              <Button variant="outline" nativeButton={false} render={<Link href="/settings" />}>
                前往設定
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
