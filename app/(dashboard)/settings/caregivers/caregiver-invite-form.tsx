'use client'

import { startTransition, useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { inviteCaregiverAction, type InviteCaregiverState } from './actions'

const INITIAL_STATE: InviteCaregiverState = { status: 'idle' }

export function CaregiverInviteForm() {
  const [state, formAction, isPending] = useActionState(inviteCaregiverAction, INITIAL_STATE)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = new FormData(event.currentTarget).get('email')
    if (typeof email !== 'string') return
    startTransition(() => {
      formAction(email)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">協作者 Email</Label>
        <Input id="email" name="email" type="email" required placeholder="對方已註冊的 email" />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.status === 'success' && <p className="text-sm text-primary">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? '送出中…' : '送出邀請'}
      </Button>
    </form>
  )
}
