import { Bell, ChevronRight, Users } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { listPendingInvitationsForUser } from '@/lib/data/pet-caregivers'
import { createClient } from '@/lib/supabase/server'

import { signOut } from './actions'
import { CatProfileForm } from './cat-profile-form'
import { PendingInvitationsSection } from './pending-invitations-section'

// 貓咪基本資料、目標水量與醫囑設定
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const catProfile = user ? await getCatProfile(supabase, user.id) : null
  // 協作者看到的是別人的貓，不能讓對方以為可以編輯貓咪基本資料
  const isOwner = !catProfile || catProfile.ownerId === user?.id
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
          {catProfile && (
            <div className="space-y-2">
              {isOwner && (
                <Link
                  href="/settings/caregivers"
                  className="flex items-center gap-3 rounded-2xl bg-input p-3.5 transition-colors hover:bg-secondary"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Users className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-semibold">管理協作者</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              )}
              <Link
                href="/settings/reminders"
                className="flex items-center gap-3 rounded-2xl bg-input p-3.5 transition-colors hover:bg-secondary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAE6EF] text-[#76638C]">
                  <Bell className="size-5" aria-hidden="true" />
                </span>
                <span className="flex-1 text-sm font-semibold">主動提醒排程</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

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
