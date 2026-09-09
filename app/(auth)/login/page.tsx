'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signInWithGoogle, signInWithMagicLink, type MagicLinkState } from './actions'

const INITIAL_STATE: MagicLinkState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signInWithMagicLink, INITIAL_STATE)

  return (
    <main className="w-full max-w-sm space-y-6">
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

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? '寄送中…' : '寄送登入連結'}
        </Button>
      </form>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        或
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          使用 Google 帳號登入
        </Button>
      </form>
    </main>
  )
}
