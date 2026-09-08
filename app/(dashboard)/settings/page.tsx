import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

import { signOut } from './actions'

// 貓咪基本資料、目標水量與醫囑設定
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            貓咪基本資料 / IRIS 分期 / 飲水目標 / 醫囑輸液量與次數（待接 CatProfileSchema）
          </p>

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
