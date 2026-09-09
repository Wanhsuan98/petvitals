import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ErrorFallback({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>發生錯誤</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          資料讀取失敗，可能是網路不穩定或伺服器暫時無法回應，請稍後再試一次。
        </p>
        <Button onClick={() => reset()}>重試</Button>
      </CardContent>
    </Card>
  )
}
