'use client'

import { startTransition, useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PendingInvitation } from '@/lib/data/pet-caregivers'

import { acceptCaregiverInvitationAction, type AcceptInvitationState } from './actions'

const INITIAL_STATE: AcceptInvitationState = { status: 'idle' }

// invitation.id 一定是從 DB 讀回來的既有資料列，只有還沒送出的暫時物件才會是 undefined；
// 用型別謂語過濾掉理論上不會發生的情況，之後就不需要重複做 undefined 檢查
type SavedInvitation = PendingInvitation & { id: string }

function hasId(invitation: PendingInvitation): invitation is SavedInvitation {
  return typeof invitation.id === 'string'
}

export function PendingInvitationsSection({ invitations }: { invitations: PendingInvitation[] }) {
  const savedInvitations = invitations.filter(hasId)
  if (savedInvitations.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>邀請通知</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {savedInvitations.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </CardContent>
    </Card>
  )
}

function InvitationRow({ invitation }: { invitation: SavedInvitation }) {
  const [state, formAction, isPending] = useActionState(
    acceptCaregiverInvitationAction,
    INITIAL_STATE
  )

  function onAccept() {
    startTransition(() => {
      formAction(invitation.id)
    })
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          你被邀請協助照顧 <span className="font-medium">{invitation.catName}</span>
        </p>
        <Button size="sm" disabled={isPending} onClick={onAccept}>
          {isPending ? '處理中…' : '接受邀請'}
        </Button>
      </div>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  )
}
