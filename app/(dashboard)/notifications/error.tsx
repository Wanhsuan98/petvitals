'use client'

import { useEffect } from 'react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotificationsError({
  error,
  retry
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      {/* 固定回 /settings，不比照 page.tsx 依 catProfile 切換：錯誤邊界是 Client Component，
          拿不到貓咪資料，而 /settings 對「有貓」與「還沒建檔」的使用者都是可直達的安全落點 */}
      <PageHeader title="通知中心" backHref="/settings" />
      <Card>
        <CardHeader>
          <CardTitle>暫時無法讀取通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p role="alert" className="text-sm text-muted-foreground">
            請確認網路連線後重試，你的邀請不會因此被標記為已處理。
          </p>
          <Button onClick={retry}>重新讀取</Button>
        </CardContent>
      </Card>
    </div>
  )
}
