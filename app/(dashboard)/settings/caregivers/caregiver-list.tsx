'use client'

import { startTransition, useActionState } from 'react'

import { Button } from '@/components/ui/button'
import type { PetCaregiver } from '@/lib/schemas'

import { removeCaregiverAction, type RemoveCaregiverState } from './actions'

const INITIAL_STATE: RemoveCaregiverState = { status: 'idle' }

const STATUS_LABEL: Record<PetCaregiver['status'], string> = {
  PENDING: '邀請中，尚未接受',
  ACCEPTED: '已接受'
}

// caregiver.id 只有在建立表單「還沒送出」的暫時物件才會是 undefined；
// 這裡的 caregivers 一定是從 DB 讀回來的既有資料列，用型別謂語過濾掉理論上不會發生的情況，
// 之後就不需要在每個用到 id 的地方重複做 undefined 檢查
type SavedCaregiver = PetCaregiver & { id: string }

function hasId(caregiver: PetCaregiver): caregiver is SavedCaregiver {
  return typeof caregiver.id === 'string'
}

export function CaregiverList({ caregivers }: { caregivers: PetCaregiver[] }) {
  const savedCaregivers = caregivers.filter(hasId)

  if (savedCaregivers.length === 0) {
    return <p className="text-sm text-muted-foreground">目前沒有協作者，邀請後會顯示在這裡。</p>
  }

  return (
    <div className="space-y-2">
      {savedCaregivers.map((caregiver) => (
        <CaregiverRow key={caregiver.id} caregiver={caregiver} />
      ))}
    </div>
  )
}

function CaregiverRow({ caregiver }: { caregiver: SavedCaregiver }) {
  const [state, formAction, isPending] = useActionState(removeCaregiverAction, INITIAL_STATE)

  function onRemove() {
    startTransition(() => {
      formAction(caregiver.id)
    })
  }

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{caregiver.invitedEmail}</p>
          <p className="text-xs text-muted-foreground">{STATUS_LABEL[caregiver.status]}</p>
        </div>
        <Button size="sm" variant="outline" disabled={isPending} onClick={onRemove}>
          {isPending ? '處理中…' : '移除'}
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
