'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { clearOfflineCache } from '@/lib/offline-cache'

import { signOut } from './actions'

// 先清掉裝置上的離線快取再登出：快取裡有先前瀏覽過的病歷頁面，
// 不清的話下一位在同一台裝置登入的人可能讀到
export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await clearOfflineCache()
          await signOut()
        })
      }}
    >
      {isPending ? '登出中…' : '登出'}
    </Button>
  )
}
