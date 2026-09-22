import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { listPendingInvitationsForUser } from '@/lib/data/pet-caregivers'
import { getLatestSubscription } from '@/lib/data/subscriptions'
import { createClient } from '@/lib/supabase/server'

import { signOut } from './actions'
import { CatProfileForm } from './cat-profile-form'
import { PendingInvitationsSection } from './pending-invitations-section'
import { SubscriptionSection } from './subscription-section'

// 貓咪基本資料、目標水量與醫囑設定
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const catProfile = user ? await getCatProfile(supabase, user.id) : null
  // 訂閱是 owner 專屬的管理項目：如果目前看到的貓不是自己的（協作者身分），
  // 不能顯示自己的訂閱狀態給對方看，也不能讓對方以為可以在這裡訂閱/取消別人的貓
  const isOwner = !catProfile || catProfile.ownerId === user?.id
  const subscription = user && isOwner ? await getLatestSubscription(supabase, user.id) : null
  // 跟「沒有貓咪資料」的空狀態分開判斷：一個人可能已經有自己的貓，同時又收到別人的協作邀請
  const pendingInvitations = user ? await listPendingInvitationsForUser(supabase, user.id) : []

  return (
    <div className="space-y-4">
      <PendingInvitationsSection invitations={pendingInvitations} />

      <Card>
        <CardHeader>
          <CardTitle>貓咪資料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!catProfile && (
            <p className="text-sm text-muted-foreground">
              尚未建立貓咪資料，請先填寫下方表單才能開始使用打卡與血檢紀錄功能。
            </p>
          )}
          {catProfile && !isOwner ? (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                你是協作者，{catProfile.name} 的基本資料由飼主管理，這裡僅供查看。
              </p>
              <p>
                名字：<span className="font-medium">{catProfile.name}</span>
              </p>
              <p>
                目標體重：<span className="font-medium">{catProfile.targetWeightKg} kg</span>
              </p>
            </div>
          ) : (
            <CatProfileForm catProfile={catProfile} />
          )}
          {catProfile && isOwner && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/settings/caregivers">管理協作者</Link>}
            />
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>訂閱方案</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionSection subscription={subscription} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>帳號</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.email && (
            <p className="text-sm">
              已登入：<span className="font-medium">{user.email}</span>
            </p>
          )}

          <form action={signOut}>
            <Button type="submit" variant="outline">
              登出
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
