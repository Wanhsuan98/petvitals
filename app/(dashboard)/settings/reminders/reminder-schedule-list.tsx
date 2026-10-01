'use client'

import { startTransition, useActionState } from 'react'

import { Button } from '@/components/ui/button'
import type { ReminderSchedule } from '@/lib/schemas'

import {
  deleteReminderScheduleAction,
  toggleReminderScheduleAction,
  type DeleteReminderScheduleState,
  type ToggleReminderScheduleState
} from './actions'

const TYPE_LABEL: Record<ReminderSchedule['type'], string> = {
  FLUID: '輸液',
  MEDICATION: '用藥',
  DAILY_LOG: '每日打卡'
}

// schedule.id 只有在建立表單「還沒送出」的暫時物件才會是 undefined；這裡的
// schedules 一定是從 DB 讀回來的既有資料列，用型別謂語過濾掉理論上不會發生的情況
type SavedReminderSchedule = ReminderSchedule & { id: string }

function hasId(schedule: ReminderSchedule): schedule is SavedReminderSchedule {
  return typeof schedule.id === 'string'
}

export function ReminderScheduleList({
  schedules,
  canManage
}: {
  schedules: ReminderSchedule[]
  canManage: boolean
}) {
  const savedSchedules = schedules.filter(hasId)

  if (savedSchedules.length === 0) {
    return <p className="text-sm text-muted-foreground">目前沒有提醒排程。</p>
  }

  return (
    <div className="space-y-2">
      {savedSchedules.map((schedule) => (
        <ReminderScheduleRow key={schedule.id} schedule={schedule} canManage={canManage} />
      ))}
    </div>
  )
}

const TOGGLE_INITIAL_STATE: ToggleReminderScheduleState = { status: 'idle' }
const DELETE_INITIAL_STATE: DeleteReminderScheduleState = { status: 'idle' }

function ReminderScheduleRow({
  schedule,
  canManage
}: {
  schedule: SavedReminderSchedule
  canManage: boolean
}) {
  const [toggleState, toggleAction, isToggling] = useActionState(
    toggleReminderScheduleAction,
    TOGGLE_INITIAL_STATE
  )
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteReminderScheduleAction,
    DELETE_INITIAL_STATE
  )

  function onToggle() {
    startTransition(() => {
      toggleAction({ id: schedule.id, enabled: !schedule.enabled })
    })
  }

  function onDelete() {
    startTransition(() => {
      deleteAction(schedule.id)
    })
  }

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {schedule.timeOfDay}・{TYPE_LABEL[schedule.type]}・{schedule.label}
          </p>
          <p className="text-xs text-muted-foreground">{schedule.enabled ? '已啟用' : '已暫停'}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={isToggling} onClick={onToggle}>
              {isToggling ? '處理中…' : schedule.enabled ? '暫停' : '啟用'}
            </Button>
            <Button size="sm" variant="outline" disabled={isDeleting} onClick={onDelete}>
              {isDeleting ? '刪除中…' : '刪除'}
            </Button>
          </div>
        )}
      </div>
      {toggleState.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {toggleState.message}
        </p>
      )}
      {deleteState.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {deleteState.message}
        </p>
      )}
    </div>
  )
}
