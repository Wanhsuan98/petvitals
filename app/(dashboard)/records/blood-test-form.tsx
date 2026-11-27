'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { useForm, type DefaultValues } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { OfflineNotice } from '@/components/offline-notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BloodTestPrefill } from '@/lib/ai/blood-test-extraction'
import { withNetworkErrorFallback } from '@/lib/network-error'
import { BloodTestSchema, type BloodTest } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

import { BloodTestAiPanel } from './blood-test-ai-panel'
import { planPrefill, type PrefillField } from './blood-test-prefill-plan'
import { createBloodTestAction, type CreateBloodTestState } from './new/actions'
import { updateBloodTestAction, type UpdateBloodTestState } from './actions'

const bloodTestFormSchema = BloodTestSchema.omit({
  id: true,
  petId: true,
  createdAt: true
})

type BloodTestFormInput = z.input<typeof bloodTestFormSchema>
type BloodTestFormOutput = z.output<typeof bloodTestFormSchema>

// 必填數值預設為空白而不是 0：預設 0 時沒填就送出會存成 0，被判斷為「血磷正常」
const DEFAULT_VALUES: DefaultValues<BloodTestFormInput> = {
  testDate: '',
  hospitalName: '',
  bun: undefined,
  creatinine: undefined,
  sdma: undefined,
  phosphorus: undefined,
  hct: undefined,
  notes: ''
}

// 包在模組層級，避免每次 render 都產生新的 action 函式
const createWithFallback = withNetworkErrorFallback(createBloodTestAction)
const updateWithFallback = withNetworkErrorFallback(updateBloodTestAction)

const INITIAL_CREATE_STATE: CreateBloodTestState = { status: 'idle' }
const INITIAL_UPDATE_STATE: UpdateBloodTestState = { status: 'idle' }

function toDefaultValues(bloodTest: BloodTest | undefined): DefaultValues<BloodTestFormInput> {
  if (!bloodTest) return { ...DEFAULT_VALUES, testDate: toLocalDateString(new Date()) }
  return {
    testDate: bloodTest.testDate,
    hospitalName: bloodTest.hospitalName ?? '',
    bun: bloodTest.bun,
    creatinine: bloodTest.creatinine,
    sdma: bloodTest.sdma,
    phosphorus: bloodTest.phosphorus,
    hct: bloodTest.hct,
    notes: bloodTest.notes ?? ''
  }
}

// 新增與編輯共用同一份表單：傳入 bloodTest 就是編輯該筆紀錄。
// returnHref 是儲存成功後回到的紀錄頁網址（編輯時帶著原本的時間篩選）。
// aiExtraction 有傳入時顯示「拍照辨識報告」，只在新增時提供（ADR-010）
export function BloodTestForm({
  bloodTest,
  returnHref = '/records',
  aiExtraction
}: {
  bloodTest?: BloodTest
  returnHref?: string
  aiExtraction?: { initialRemaining: number | undefined }
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
  const bloodTestId = bloodTest?.id
  const isEditing = bloodTestId !== undefined
  const state = isEditing ? updateState : createState
  const isPending = isEditing ? isUpdating : isCreating

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<BloodTestFormInput, unknown, BloodTestFormOutput>({
    resolver: zodResolver(bloodTestFormSchema),
    defaultValues: toDefaultValues(bloodTest)
  })

  // 每個欄位下方的 AI 辨識說明。使用者手動修改該欄後就移除，避免把人工輸入誤標成 AI 辨識
  const [aiNotes, setAiNotes] = useState<Partial<Record<PrefillField, string>>>({})
  // 檢驗日期預設是今天、不是空白，所以另外記錄「使用者或前一頁辨識是否已經設定過」
  const [isTestDateSet, setIsTestDateSet] = useState(false)
  // 表單一開始的檢驗日期。AI 辨識要等幾秒，結果回來時呼叫的 applyPrefill 可能來自較早的 render，
  // isTestDateSet 會是舊值；所以同時比對表單的即時值，只要日期已經不是預設值，就視為使用者改過
  const [initialTestDate] = useState(() => getValues('testDate'))

  // 只有使用者輸入會觸發 register 的 onChange，setValue（AI 預填）不會，所以可以用來區分兩者
  function handleUserEdit(field: PrefillField) {
    if (field === 'testDate') setIsTestDateSet(true)
    setAiNotes((notes) => {
      if (!(field in notes)) return notes
      const next = { ...notes }
      delete next[field]
      return next
    })
  }

  function applyPrefill(prefill: BloodTestPrefill): number {
    const current = getValues()
    const plan = planPrefill(prefill, {
      ...current,
      isTestDateDirty: isTestDateSet || current.testDate !== initialTestDate
    })
    const options = { shouldDirty: true, shouldValidate: true }
    for (const [field, value] of Object.entries(plan.values)) {
      setValue(field as PrefillField, value, options)
    }
    if (plan.values.testDate !== undefined) setIsTestDateSet(true)
    setAiNotes((notes) => ({ ...notes, ...plan.notes }))
    return Object.keys(plan.values).length
  }

  useEffect(() => {
    if (state.status === 'success') router.push(returnHref)
  }, [state.status, router, returnHref])

  function onSubmit(values: BloodTestFormOutput) {
    startTransition(() => {
      if (bloodTestId) updateAction({ id: bloodTestId, values })
      else createAction(values)
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
      {aiExtraction && !isEditing && (
        <BloodTestAiPanel
          initialRemaining={aiExtraction.initialRemaining}
          onPrefill={applyPrefill}
        />
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <OfflineNotice />
        <div className="space-y-1.5">
          <Label htmlFor="testDate">檢驗日期</Label>
          <Input
            id="testDate"
            type="date"
            aria-invalid={!!errors.testDate}
            aria-describedby={
              [aiNotes.testDate ? 'testDate-hint' : null, errors.testDate ? 'testDate-error' : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            {...register('testDate', { onChange: () => handleUserEdit('testDate') })}
          />
          {aiNotes.testDate && (
            <p id="testDate-hint" className="text-xs text-muted-foreground">
              {aiNotes.testDate}
            </p>
          )}
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
            aria-describedby={aiNotes.hospitalName ? 'hospitalName-hint' : undefined}
            {...register('hospitalName', { onChange: () => handleUserEdit('hospitalName') })}
          />
          {aiNotes.hospitalName && (
            <p id="hospitalName-hint" className="text-xs text-muted-foreground">
              {aiNotes.hospitalName}
            </p>
          )}
        </div>

        {/* placeholder 只示範輸入格式，不放參考範圍：各醫院的參考範圍不同，
            放了容易被當成「正常值」判讀，數值請以醫院報告為準 */}
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="bun"
            label="BUN 尿素氮"
            unit="mg/dL"
            placeholder="例：32.5"
            register={register}
            registerOptions={{ valueAsNumber: true, onChange: () => handleUserEdit('bun') }}
            error={errors.bun}
            hint={aiNotes.bun}
          />

          <NumberField
            id="creatinine"
            label="Creatinine 肌酸酐"
            step="0.1"
            unit="mg/dL"
            placeholder="例：2.1"
            register={register}
            registerOptions={{ valueAsNumber: true, onChange: () => handleUserEdit('creatinine') }}
            error={errors.creatinine}
            hint={aiNotes.creatinine}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="sdma"
            label="SDMA (選填)"
            unit="ug/dL"
            placeholder="例：18"
            register={register}
            registerOptions={{
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
              onChange: () => handleUserEdit('sdma')
            }}
            error={errors.sdma}
            hint={aiNotes.sdma}
          />

          <NumberField
            id="phosphorus"
            label="Phosphorus 血磷"
            step="0.1"
            unit="mg/dL"
            placeholder="例：4.6"
            register={register}
            registerOptions={{ valueAsNumber: true, onChange: () => handleUserEdit('phosphorus') }}
            error={errors.phosphorus}
            hint={aiNotes.phosphorus}
          />
        </div>

        <NumberField
          id="hct"
          label="HCT 紅血球容積比 (選填，貧血評估)"
          unit="%"
          placeholder="例：35"
          register={register}
          registerOptions={{
            setValueAs: (value) => (value === '' ? undefined : Number(value)),
            onChange: () => handleUserEdit('hct')
          }}
          error={errors.hct}
          hint={aiNotes.hct}
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
              {isEditing ? '儲存變更' : '儲存血檢紀錄'}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
