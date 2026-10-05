'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, Droplets } from 'lucide-react'
import { startTransition, useActionState, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useLocalTime } from '@/lib/use-local-time'
import { toLocalDateString } from '@/lib/utils'

import { createDailyCareLogAction, type CreateDailyCareLogState } from './actions'

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

const INITIAL_STATE: CreateDailyCareLogState = { status: 'idle' }

export function LogForm({ dailyCareLogs }: { dailyCareLogs: DailyCareLog[] }) {
  const [state, formAction, isPending] = useActionState(createDailyCareLogAction, INITIAL_STATE)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<DailyCareLogFormInput, unknown, DailyCareLogFormOutput>({
    resolver: zodResolver(dailyCareLogFormSchema),
    defaultValues: DEFAULT_VALUES
  })

  useEffect(() => {
    if (state.status === 'success') reset(DEFAULT_VALUES)
  }, [state.status, reset])

  function onSubmit(values: DailyCareLogFormOutput) {
    const now = new Date()
    startTransition(() => {
      formAction({
        ...values,
        recordedAt: now.toISOString(),
        date: toLocalDateString(now)
      })
    })
  }

  const localTime = useLocalTime()
  const todayDate = localTime === null ? '' : toLocalDateString(new Date(localTime))
  const todayLogs = useMemo(
    () => dailyCareLogs.filter((log) => log.date === todayDate),
    [dailyCareLogs, todayDate]
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>每日打卡</CardTitle>
          <CardDescription>
            10 秒記錄今天的輸液量 / 飲水量 / 體重，資料會依裝置本地時間歸入當天。
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                '記錄中…'
              ) : (
                <>
                  <CircleCheck className="size-5" aria-hidden="true" />
                  完成打卡
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {todayLogs.length > 0 && (
        <section aria-label="今日已記錄">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold">今日已記錄 ({todayLogs.length} 筆)</h2>
          </div>
          <div className="space-y-3">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-(--card-shadow)"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Droplets className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-bold">
                    輸液 {log.subQFluidMl}ml・飲水 {log.waterIntakeMl}ml
                    {typeof log.weightKg === 'number' ? `・體重 ${log.weightKg}kg` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {new Date(log.recordedAt).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
