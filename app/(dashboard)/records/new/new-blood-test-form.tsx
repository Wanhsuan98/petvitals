'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useActionState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BloodTestSchema } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

import { createBloodTestAction, type CreateBloodTestState } from './actions'

const bloodTestFormSchema = BloodTestSchema.omit({
  id: true,
  petId: true,
  createdAt: true
})

type BloodTestFormInput = z.input<typeof bloodTestFormSchema>
type BloodTestFormOutput = z.output<typeof bloodTestFormSchema>

const DEFAULT_VALUES: BloodTestFormInput = {
  testDate: '',
  hospitalName: '',
  bun: 0,
  creatinine: 0,
  sdma: undefined,
  phosphorus: 0,
  hct: undefined,
  notes: ''
}

const INITIAL_STATE: CreateBloodTestState = { status: 'idle' }

export function NewBloodTestForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createBloodTestAction, INITIAL_STATE)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<BloodTestFormInput, unknown, BloodTestFormOutput>({
    resolver: zodResolver(bloodTestFormSchema),
    defaultValues: { ...DEFAULT_VALUES, testDate: toLocalDateString(new Date()) }
  })

  useEffect(() => {
    if (state.status === 'success') router.push('/records')
  }, [state.status, router])

  function onSubmit(values: BloodTestFormOutput) {
    startTransition(() => {
      formAction(values)
    })
  }

  return (
    <div>
      <div className="mb-5 rounded-2xl bg-secondary/80 p-4 text-xs leading-relaxed text-secondary-foreground">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            數值請依醫院報告上標示的單位輸入（BUN/Creatinine/Phosphorus 為 mg/dL，SDMA 為 ug/dL，HCT
            為 %）。
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="testDate">檢驗日期</Label>
          <Input
            id="testDate"
            type="date"
            aria-invalid={!!errors.testDate}
            aria-describedby={errors.testDate ? 'testDate-error' : undefined}
            {...register('testDate')}
          />
          {errors.testDate && (
            <p id="testDate-error" className="text-xs text-destructive">
              {errors.testDate.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hospitalName">醫院名稱（選填）</Label>
          <Input
            id="hospitalName"
            placeholder="例如：安家貓專科動物醫院"
            {...register('hospitalName')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="bun"
            label="BUN 尿素氮"
            unit="mg/dL"
            placeholder="16-36"
            register={register}
            registerOptions={{ valueAsNumber: true }}
            error={errors.bun}
          />

          <NumberField
            id="creatinine"
            label="Creatinine 肌酸酐"
            step="0.1"
            unit="mg/dL"
            placeholder="0.8-2.4"
            register={register}
            registerOptions={{ valueAsNumber: true }}
            error={errors.creatinine}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="sdma"
            label="SDMA (選填)"
            unit="ug/dL"
            placeholder="0-14"
            register={register}
            registerOptions={{
              setValueAs: (value) => (value === '' ? undefined : Number(value))
            }}
            error={errors.sdma}
          />

          <NumberField
            id="phosphorus"
            label="Phosphorus 血磷"
            step="0.1"
            unit="mg/dL"
            placeholder="2.5-6.8"
            register={register}
            registerOptions={{ valueAsNumber: true }}
            error={errors.phosphorus}
          />
        </div>

        <NumberField
          id="hct"
          label="HCT 紅血球容積比 (選填，貧血評估)"
          unit="%"
          placeholder="30-45"
          register={register}
          registerOptions={{
            setValueAs: (value) => (value === '' ? undefined : Number(value))
          }}
          error={errors.hct}
        />

        <div className="space-y-1.5">
          <Label htmlFor="notes">備註（選填）</Label>
          <Textarea id="notes" rows={2} maxLength={100} {...register('notes')} />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
        </div>

        {state.status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting || isPending} className="w-full">
          {isSubmitting || isPending ? (
            '儲存中…'
          ) : (
            <>
              <Save className="size-5" aria-hidden="true" />
              儲存血檢紀錄
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
