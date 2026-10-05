'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { startTransition, useActionState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ReminderScheduleSchema } from '@/lib/schemas'

import { createReminderScheduleAction, type CreateReminderScheduleState } from './actions'

const TYPE_OPTIONS = [
  { value: 'FLUID', label: '輸液' },
  { value: 'MEDICATION', label: '用藥' },
  { value: 'DAILY_LOG', label: '每日打卡' }
] as const

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
// 分鐘只列 5 的倍數：cron 只在每個 5 分鐘整數點比對排程，原生 <input type="time"> 的
// step 屬性在手機瀏覽器（尤其 iOS Safari）上不保證生效，改用下拉選單從源頭排除非法選項
const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

const reminderFormSchema = ReminderScheduleSchema.pick({
  type: true,
  label: true,
  timeOfDay: true
})

type ReminderFormInput = z.input<typeof reminderFormSchema>
type ReminderFormOutput = z.output<typeof reminderFormSchema>

const DEFAULT_VALUES: ReminderFormInput = {
  type: 'FLUID',
  label: '',
  timeOfDay: '09:00'
}

const INITIAL_STATE: CreateReminderScheduleState = { status: 'idle' }

export function ReminderScheduleForm() {
  const [state, formAction, isPending] = useActionState(createReminderScheduleAction, INITIAL_STATE)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ReminderFormInput, unknown, ReminderFormOutput>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: DEFAULT_VALUES
  })

  useEffect(() => {
    if (state.status === 'success') reset(DEFAULT_VALUES)
  }, [state.status, reset])

  function onSubmit(values: ReminderFormOutput) {
    startTransition(() => {
      formAction(values)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="type">提醒類型</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="請選擇提醒類型" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="label">提醒名稱</Label>
        <Input id="label" maxLength={20} placeholder="例如：早上輸液" {...register('label')} />
        {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="timeOfDay-hour">提醒時間</Label>
        <Controller
          control={control}
          name="timeOfDay"
          render={({ field }) => {
            const [hour, minute] = field.value.split(':')
            return (
              <div className="flex items-center gap-2">
                <Select
                  value={hour}
                  onValueChange={(newHour) => field.onChange(`${newHour}:${minute}`)}
                >
                  <SelectTrigger id="timeOfDay-hour" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select
                  value={minute}
                  onValueChange={(newMinute) => field.onChange(`${hour}:${newMinute}`)}
                >
                  <SelectTrigger id="timeOfDay-minute" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }}
        />
        {errors.timeOfDay && <p className="text-xs text-destructive">{errors.timeOfDay.message}</p>}
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.status === 'success' && <p className="text-sm text-primary">{state.message}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting || isPending} className="w-full">
        {isSubmitting || isPending ? '新增中…' : '新增提醒'}
      </Button>
    </form>
  )
}
