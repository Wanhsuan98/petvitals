'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useActionState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DailyCareLogSchema, type DailyCareLog } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

import { createDailyCareLogAction, type CreateDailyCareLogState } from './actions'
import { updateDailyCareLogAction, type UpdateDailyCareLogState } from './edit-actions'

const APPETITE_OPTIONS = [
  { value: 'GREAT', label: '食慾很好' },
  { value: 'NORMAL', label: '正常' },
  { value: 'POOR', label: '食慾不佳' },
  { value: 'FORCE_FEED', label: '需強制餵食' }
] as const

const dailyCareLogFormSchema = DailyCareLogSchema.omit({
  id: true,
  petId: true,
  recordedAt: true,
  date: true,
  createdAt: true
})

type DailyCareLogFormInput = z.input<typeof dailyCareLogFormSchema>
type DailyCareLogFormOutput = z.output<typeof dailyCareLogFormSchema>

const DEFAULT_VALUES: DailyCareLogFormInput = {
  weightKg: undefined,
  subQFluidMl: 0,
  waterIntakeMl: 0,
  appetiteLevel: 'NORMAL',
  vomitCount: 0,
  notes: ''
}

const INITIAL_CREATE_STATE: CreateDailyCareLogState = { status: 'idle' }
const INITIAL_UPDATE_STATE: UpdateDailyCareLogState = { status: 'idle' }

function toDefaultValues(dailyCareLog: DailyCareLog | undefined): DailyCareLogFormInput {
  if (!dailyCareLog) return DEFAULT_VALUES
  return {
    weightKg: dailyCareLog.weightKg,
    subQFluidMl: dailyCareLog.subQFluidMl,
    waterIntakeMl: dailyCareLog.waterIntakeMl,
    appetiteLevel: dailyCareLog.appetiteLevel,
    vomitCount: dailyCareLog.vomitCount,
    notes: dailyCareLog.notes ?? ''
  }
}

// 新增與編輯共用同一份表單：傳入 dailyCareLog 就是編輯該筆紀錄（只能改內容，不能改打卡時間與日期）
export function DailyCareLogForm({ dailyCareLog }: { dailyCareLog?: DailyCareLog }) {
  const router = useRouter()
  const [createState, createAction, isCreating] = useActionState(
    createDailyCareLogAction,
    INITIAL_CREATE_STATE
  )
  const [updateState, updateAction, isUpdating] = useActionState(
    updateDailyCareLogAction,
    INITIAL_UPDATE_STATE
  )
  const dailyCareLogId = dailyCareLog?.id
  const isEditing = dailyCareLogId !== undefined
  const state = isEditing ? updateState : createState
  const isPending = isEditing ? isUpdating : isCreating

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<DailyCareLogFormInput, unknown, DailyCareLogFormOutput>({
    resolver: zodResolver(dailyCareLogFormSchema),
    defaultValues: toDefaultValues(dailyCareLog)
  })

  // 依賴整個 state 物件而不是 state.status：連續兩次成功時 status 字串不變，
  // 只看 status 的話第二次不會重跑，表單會保留上一筆的數字
  useEffect(() => {
    if (state.status !== 'success') return
    if (isEditing) router.push('/log')
    else reset(DEFAULT_VALUES)
  }, [state, isEditing, router, reset])

  function onSubmit(values: DailyCareLogFormOutput) {
    startTransition(() => {
      if (dailyCareLogId) {
        updateAction({ id: dailyCareLogId, values })
        return
      }
      const now = new Date()
      createAction({
        ...values,
        recordedAt: now.toISOString(),
        date: toLocalDateString(now)
      })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <NumberField
        id="subQFluidMl"
        label="皮下輸液量 (ml)"
        unit="ml"
        placeholder="例如：150"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.subQFluidMl}
      />

      <NumberField
        id="waterIntakeMl"
        label="飲水量 (ml)"
        unit="ml"
        placeholder="例如：180"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.waterIntakeMl}
      />

      <NumberField
        id="weightKg"
        label="體重 (kg，選填)"
        step="0.1"
        unit="kg"
        placeholder="例如：4.15"
        register={register}
        registerOptions={{
          setValueAs: (value) => (value === '' ? undefined : Number(value))
        }}
        error={errors.weightKg}
      />

      <div className="space-y-1.5">
        <Label htmlFor="appetiteLevel">食慾狀態</Label>
        <Controller
          control={control}
          name="appetiteLevel"
          render={({ field }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="appetiteLevel" className="w-full">
                <SelectValue placeholder="請選擇食慾狀態" />
              </SelectTrigger>
              <SelectContent>
                {APPETITE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <NumberField
        id="vomitCount"
        label="今日嘔吐次數（0–20 次）"
        inputMode="numeric"
        unit="次"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.vomitCount}
      />

      <div className="space-y-1.5">
        <Label htmlFor="notes">備註（選填）</Label>
        <Textarea
          id="notes"
          rows={2}
          maxLength={100}
          placeholder="精神好、有曬太陽、下午排尿正常..."
          {...register('notes')}
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting || isPending} className="w-full">
        {isSubmitting || isPending ? (
          isEditing ? (
            '儲存中…'
          ) : (
            '記錄中…'
          )
        ) : (
          <>
            <CircleCheck className="size-5" aria-hidden="true" />
            {isEditing ? '儲存變更' : '完成打卡'}
          </>
        )}
      </Button>
    </form>
  )
}
