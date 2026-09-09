import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatProfile } from '@/lib/data/cat-profile'
import { createClient } from '@/lib/supabase/server'

import { signOut } from './actions'
import { CatProfileForm } from './cat-profile-form'

// 貓咪基本資料、目標水量與醫囑設定
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const catProfile = user ? await getCatProfile(supabase, user.id) : null

  return (
    <div className="space-y-4">
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
          <CatProfileForm catProfile={catProfile} />
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
