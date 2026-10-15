import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/page-header'
import { PendingInvitationsSection } from '@/components/pending-invitations-section'
import { PushSubscribeToggle } from '@/components/push-subscribe-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { listPendingInvitationsForUser } from '@/lib/data/pet-caregivers'
import { createClient } from '@/lib/supabase/server'

import { RefreshNotificationsButton } from './refresh-notifications-button'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [invitations, catProfile] = await Promise.all([
    listPendingInvitationsForUser(supabase, user.id),
    getCatProfile(supabase, user.id)
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
