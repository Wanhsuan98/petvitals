'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { startTransition, useActionState, useCallback, useEffect, useState } from 'react'
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

// 貓的分期參考區間，來源為 IRIS Staging of CKD（Modified 2026），見 docs/99-reference/iris.md。
// 只用來幫使用者對照獸醫報告，分期本身仍由使用者依獸醫診斷選擇，系統不依數值自動判定
const IRIS_STAGE_OPTIONS = [
  { value: 'STAGE_1', label: 'STAGE 1', range: '肌酸酐 <1.6 mg/dL｜SDMA <18 µg/dL' },
  { value: 'STAGE_2', label: 'STAGE 2', range: '肌酸酐 1.6–2.8 mg/dL｜SDMA 18–25 µg/dL' },
  { value: 'STAGE_3', label: 'STAGE 3', range: '肌酸酐 2.9–5.0 mg/dL｜SDMA 26–38 µg/dL' },
  { value: 'STAGE_4', label: 'STAGE 4', range: '肌酸酐 >5.0 mg/dL｜SDMA >38 µg/dL' }
] as const

function getIrisStageLabel(value: unknown): string {
  return IRIS_STAGE_OPTIONS.find((option) => option.value === value)?.label ?? '請選擇 IRIS 分期'
}

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

// 貓咪資料是設定一次、很少修改的資料，平常只顯示唯讀摘要，避免捲動時誤觸輸入框；
// 按「編輯」才切成表單。還沒有貓咪資料時直接顯示表單，不需要多按一步
export function CatProfileForm({
  catProfile,
  isReadOnly = false
}: {
  catProfile: CatProfile | null
  isReadOnly?: boolean
}) {
  const [isEditing, setIsEditing] = useState(!catProfile)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const handleSaved = useCallback((message?: string) => {
    setSavedMessage(message ?? null)
    setIsEditing(false)
  }, [])

  if (catProfile && (isReadOnly || !isEditing)) {
    return (
      <div className="space-y-4">
        <CatProfileSummary catProfile={catProfile} />
        {savedMessage && !isReadOnly && (
          <p role="status" className="text-sm text-primary">
            {savedMessage}
          </p>
        )}
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setSavedMessage(null)
              setIsEditing(true)
            }}
          >
            編輯
          </Button>
        )}
      </div>
    )
  }

  // 每次進入編輯都會重新掛載，上一次的錯誤訊息與未儲存的輸入不會殘留
  return (
    <CatProfileEditForm
      catProfile={catProfile}
      onSaved={handleSaved}
      onCancel={catProfile ? () => setIsEditing(false) : undefined}
    />
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

function CatProfileSummary({ catProfile }: { catProfile: CatProfile }) {
  const stageOption = IRIS_STAGE_OPTIONS.find((option) => option.value === catProfile.irisStage)
  return (
    <dl className="space-y-3 text-sm">
      <SummaryRow label="貓咪名字">{catProfile.name}</SummaryRow>
      <SummaryRow label="出生年份">{catProfile.birthYear}</SummaryRow>
      <SummaryRow label="目標體重">{catProfile.targetWeightKg} kg</SummaryRow>
      <SummaryRow label="IRIS 分期">{stageOption?.label ?? catProfile.irisStage}</SummaryRow>
      <SummaryRow label="每日飲水目標">{catProfile.dailyFluidTargetMl} ml</SummaryRow>
      <SummaryRow label="醫囑單次皮下輸液量">{catProfile.subQFluidPrescribedMl} ml</SummaryRow>
      <SummaryRow label="醫囑每日輸液次數">{catProfile.subQFluidFrequencyPerDay} 次</SummaryRow>
    </dl>
  )
}

function CatProfileEditForm({
  catProfile,
  onSaved,
  onCancel
}: {
  catProfile: CatProfile | null
  onSaved: (message?: string) => void
  onCancel?: () => void
}) {
  const [state, formAction, isPending] = useActionState(saveCatProfileAction, INITIAL_STATE)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CatProfileFormInput, unknown, CatProfileFormOutput>({
    resolver: zodResolver(catProfileFormSchema),
    defaultValues: toDefaultValues(catProfile)
  })

  useEffect(() => {
    if (state.status === 'success') onSaved(state.message)
  }, [state, onSaved])

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
                <SelectValue placeholder="請選擇 IRIS 分期">{getIrisStageLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {IRIS_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col gap-0.5 whitespace-normal">
                      <span>{option.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.range}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          區間為 IRIS 2026
          貓慢性腎病分期參考，請依獸醫師的診斷選擇。分期需在飲水充足、狀態穩定時多次檢驗，並搭配其他檢查判斷，不能只靠單一數值自行決定；肌酸酐與
          SDMA 落在不同期時，也請以獸醫師判斷為準。SDMA 區間依 IDEXX
          檢驗方法訂定，其他檢驗廠牌不一定適用。
        </p>
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

      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting || isPending}
            className="flex-1"
            onClick={onCancel}
          >
            取消
          </Button>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting || isPending} className="flex-1">
          {isSubmitting || isPending ? '儲存中…' : catProfile ? '儲存' : '建立貓咪資料'}
        </Button>
      </div>
    </form>
  )
}
