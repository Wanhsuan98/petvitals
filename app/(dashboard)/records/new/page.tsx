'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { NumberField } from '@/components/number-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { loadList, saveList, STORAGE_KEYS } from '@/lib/local-store'
import { BloodTestSchema, type BloodTest } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

// TODO(Week 3): 改由已登入使用者綁定的貓咪資料帶入，待 Supabase Auth 串接後由 context 提供
const DEMO_PET_ID = '00000000-0000-0000-0000-000000000000'

const bloodTestFormSchema = BloodTestSchema.omit({
  id: true,
  petId: true,
  createdAt: true
})

// react-hook-form 需要 schema 套用 default/optional 前的輸入型別，送出後經 zodResolver
// 驗證產生的才是輸出型別，兩者刻意分開避免型別不合（同 /log 表單的作法）
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

export default function NewBloodTestPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<BloodTestFormInput, unknown, BloodTestFormOutput>({
    resolver: zodResolver(bloodTestFormSchema),
    defaultValues: { ...DEFAULT_VALUES, testDate: toLocalDateString(new Date()) }
  })

  function onSubmit(values: BloodTestFormOutput) {
    const bloodTest: BloodTest = {
      ...values,
      id: crypto.randomUUID(),
      petId: DEMO_PET_ID,
      createdAt: new Date().toISOString()
    }

    // TODO(Week 3): 改為呼叫 Supabase 寫入 blood_tests，目前先存在 localStorage 供 /records 圖表使用
    const existing = loadList(STORAGE_KEYS.bloodTests, BloodTestSchema)
    saveList(STORAGE_KEYS.bloodTests, [bloodTest, ...existing])

    router.push('/records')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>新增血檢</CardTitle>
          <CardDescription>
            數值請依醫院報告上標示的單位輸入（BUN/Creatinine/Phosphorus 為 mg/dL，SDMA 為 ug/dL，HCT
            為 %）。
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Input id="hospitalName" {...register('hospitalName')} />
            </div>

            <NumberField
              id="bun"
              label="BUN 尿素氮 (mg/dL)"
              register={register}
              registerOptions={{ valueAsNumber: true }}
              error={errors.bun}
            />

            <NumberField
              id="creatinine"
              label="Creatinine 肌酸酐 (mg/dL)"
              step="0.1"
              register={register}
              registerOptions={{ valueAsNumber: true }}
              error={errors.creatinine}
            />

            <NumberField
              id="sdma"
              label="SDMA 早期腎指標 (ug/dL，選填)"
              register={register}
              registerOptions={{
                setValueAs: (value) => (value === '' ? undefined : Number(value))
              }}
              error={errors.sdma}
            />

            <NumberField
              id="phosphorus"
              label="Phosphorus 血磷 (mg/dL)"
              step="0.1"
              register={register}
              registerOptions={{ valueAsNumber: true }}
              error={errors.phosphorus}
            />

            <NumberField
              id="hct"
              label="HCT 紅血球容積比 (%，選填)"
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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? '儲存中…' : '儲存血檢紀錄'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
