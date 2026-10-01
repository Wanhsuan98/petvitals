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
        <Label htmlFor="timeOfDay">提醒時間</Label>
        <Input id="timeOfDay" type="time" {...register('timeOfDay')} />
        {errors.timeOfDay && <p className="text-xs text-destructive">{errors.timeOfDay.message}</p>}
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.status === 'success' && <p className="text-sm text-primary">{state.message}</p>}

      <Button type="submit" disabled={isSubmitting || isPending} className="w-full">
        {isSubmitting || isPending ? '新增中…' : '新增提醒'}
      </Button>
    </form>
  )
}
