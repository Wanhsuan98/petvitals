import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// retry 而非 reset：Next.js 16 的錯誤邊界會同時傳入兩者，但 reset 只清掉錯誤狀態、
// 不會重新抓 Server Component 的資料，對「資料讀取失敗」的情境按了等於原地再失敗一次；
// retry 會先 router.refresh() 再清狀態，才是真的重試（見 next/dist/client/components/error-boundary.js）
export function ErrorFallback({ retry }: { retry: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>發生錯誤</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          資料讀取失敗，可能是網路不穩定或伺服器暫時無法回應，請稍後再試一次。
        </p>
        <Button onClick={() => retry()}>重試</Button>
      </CardContent>
    </Card>
  )
}
