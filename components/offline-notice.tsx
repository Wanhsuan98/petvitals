'use client'

import { WifiOff } from 'lucide-react'

import { useOnlineStatus } from '@/lib/use-online-status'

// 表單上方的離線提示：PWA 離線時可以瀏覽快取頁面，但不能新增或修改資料
export function OfflineNotice() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>目前沒有網路連線。可以查看先前的紀錄，但新增或修改要等連線後才能送出。</p>
    </div>
  )
}
