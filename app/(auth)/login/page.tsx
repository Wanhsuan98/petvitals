'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearOfflineCache } from '@/lib/offline-cache'

import { signInWithGoogle, signInWithMagicLink, type MagicLinkState } from './actions'

const INITIAL_STATE: MagicLinkState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signInWithMagicLink, INITIAL_STATE)

  // 登入過期被導回這裡時，上一位使用者沒有按登出，快取也就沒被清；
  // 在登入頁再清一次，確保下一個登入的人不會讀到前一位的離線快取
  useEffect(() => {
    void clearOfflineCache()
  }, [])

  return (
    <main className="w-full min-w-0 max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">PetVitals 登入</h1>
        <p className="text-sm text-muted-foreground">
          輸入 Email 取得登入連結，或用 Google 帳號登入。
        </p>
      </div>

      <form action={formAction} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={state.status === 'error'}
            aria-describedby={state.status === 'error' ? 'email-message' : undefined}
          />
        </div>

        {state.status === 'error' && (
          <p id="email-message" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        {state.status === 'sent' && (
          <p id="email-message" className="text-sm text-primary">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {isPending ? '寄送中…' : '寄送登入連結'}
        </Button>
      </form>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        或
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          使用 Google 帳號登入
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        PetVitals 是居家照護紀錄的輔助工具，不提供獸醫診斷或醫療建議，病情與用藥請遵循獸醫師指示。
        <Link href="/service#medical-disclaimer" className="underline underline-offset-4">
          閱讀完整醫療免責聲明
        </Link>
      </p>
    </main>
  )
}
