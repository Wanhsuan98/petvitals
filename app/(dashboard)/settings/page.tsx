import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 貓咪基本資料、目標水量與醫囑設定
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            貓咪基本資料 / IRIS 分期 / 飲水目標 / 醫囑輸液量與次數（待接 CatProfileSchema）
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
