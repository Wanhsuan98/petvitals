'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useActionState, useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { OfflineNotice } from '@/components/offline-notice'
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
import { checkFluidOverPrescribed } from '@/lib/clinical'
import { withNetworkErrorFallback } from '@/lib/network-error'
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

// 包在模組層級，避免每次 render 都產生新的 action 函式
const createWithFallback = withNetworkErrorFallback(createDailyCareLogAction)
const updateWithFallback = withNetworkErrorFallback(updateDailyCareLogAction)

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
// prescribedSubQFluidMl 是醫囑單次輸液量：超過只提示、不擋存檔（防呆上限 600ml 由 schema 把關，兩者分開）
export function DailyCareLogForm({
  dailyCareLog,
  prescribedSubQFluidMl
}: {
  dailyCareLog?: DailyCareLog
  prescribedSubQFluidMl: number
}) {
  const router = useRouter()
  const [createState, createAction, isCreating] = useActionState(
    createWithFallback,
    INITIAL_CREATE_STATE
  )
  const [updateState, updateAction, isUpdating] = useActionState(
    updateWithFallback,
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

  const subQFluidMl = useWatch({ control, name: 'subQFluidMl' })
  // 欄位清空時 valueAsNumber 會是 NaN，不提示；醫囑量設為 0（沒有開輸液）時任何輸液都會提示，這是預期行為
  const fluidCheck =
    typeof subQFluidMl === 'number' && Number.isFinite(subQFluidMl)
      ? checkFluidOverPrescribed(subQFluidMl, prescribedSubQFluidMl)
      : null

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
      <OfflineNotice />
      <NumberField
        id="subQFluidMl"
        label="皮下輸液量 (ml)"
        unit="ml"
        placeholder="例如：150"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.subQFluidMl}
      />
      {fluidCheck?.isOverPrescribed && (
        <p role="status" className="-mt-2 text-xs font-medium text-accent-text">
          {fluidCheck.message}
        </p>
      )}

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
