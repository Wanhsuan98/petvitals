'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { startTransition, useActionState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { NumberField } from '@/components/number-field'
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
import { CatProfileSchema, type CatProfile } from '@/lib/schemas'

import {
  saveCatProfileAction,
  type CatProfileFormInput,
  type CatProfileFormOutput,
  type SaveCatProfileState
} from './actions'

const IRIS_STAGE_OPTIONS = [
  { value: 'STAGE_1', label: 'STAGE 1' },
  { value: 'STAGE_2', label: 'STAGE 2' },
  { value: 'STAGE_3', label: 'STAGE 3' },
  { value: 'STAGE_4', label: 'STAGE 4' }
] as const

const catProfileFormSchema = CatProfileSchema.omit({ id: true, ownerId: true, createdAt: true })

const INITIAL_STATE: SaveCatProfileState = { status: 'idle' }

function toDefaultValues(catProfile: CatProfile | null): CatProfileFormInput {
  return {
    name: catProfile?.name ?? '',
    birthYear: catProfile?.birthYear ?? new Date().getFullYear(),
    targetWeightKg: catProfile?.targetWeightKg ?? 4,
    irisStage: catProfile?.irisStage ?? 'STAGE_2',
    dailyFluidTargetMl: catProfile?.dailyFluidTargetMl ?? 200,
    subQFluidPrescribedMl: catProfile?.subQFluidPrescribedMl ?? 100,
    subQFluidFrequencyPerDay: catProfile?.subQFluidFrequencyPerDay ?? 1
  }
}

export function CatProfileForm({ catProfile }: { catProfile: CatProfile | null }) {
  const [state, formAction, isPending] = useActionState(saveCatProfileAction, INITIAL_STATE)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CatProfileFormInput, unknown, CatProfileFormOutput>({
    resolver: zodResolver(catProfileFormSchema),
    defaultValues: toDefaultValues(catProfile)
  })

  // 儲存成功後用最新資料重設表單的 dirty 狀態，避免使用者以為還有未儲存的變更
  useEffect(() => {
    if (state.status === 'success') reset(undefined, { keepValues: true })
  }, [state.status, reset])

  function onSubmit(values: CatProfileFormOutput) {
    startTransition(() => {
      formAction(values)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">貓咪名字</Label>
        <Input
          id="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <NumberField
        id="birthYear"
        label="出生年份"
        inputMode="numeric"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.birthYear}
      />

      <NumberField
        id="targetWeightKg"
        label="目標體重 (kg)"
        step="0.1"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.targetWeightKg}
      />

      <div className="space-y-1.5">
        <Label htmlFor="irisStage">IRIS 分期</Label>
        <Controller
          control={control}
          name="irisStage"
          render={({ field }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="irisStage" className="w-full">
                <SelectValue placeholder="請選擇 IRIS 分期" />
              </SelectTrigger>
              <SelectContent>
                {IRIS_STAGE_OPTIONS.map((option) => (
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
        id="dailyFluidTargetMl"
        label="每日飲水目標 (ml)"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.dailyFluidTargetMl}
      />

      <NumberField
        id="subQFluidPrescribedMl"
        label="醫囑單次皮下輸液量 (ml)"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.subQFluidPrescribedMl}
      />

      <NumberField
        id="subQFluidFrequencyPerDay"
        label="醫囑每日輸液次數"
        inputMode="numeric"
        register={register}
        registerOptions={{ valueAsNumber: true }}
        error={errors.subQFluidFrequencyPerDay}
      />

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.status === 'success' && <p className="text-sm text-primary">{state.message}</p>}

      <Button type="submit" disabled={isSubmitting || isPending} className="w-full">
        {isSubmitting || isPending ? '儲存中…' : catProfile ? '更新貓咪資料' : '建立貓咪資料'}
      </Button>
    </form>
  )
}
