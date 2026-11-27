import { z } from 'zod'

import { BloodTestSchema, isValidCalendarDate } from '@/lib/schemas'

// 血檢報告照片的 AI 辨識結果，以及轉成表單預填值的規則。
// 規格見 docs/02-data-contract/blood-test-extraction.md。這個檔案只放純函式與 Zod schema，
// 不呼叫 API，前後端都可以引用，也方便單元測試。
// 給模型的 prompt 與 JSON schema 放在 blood-test-extraction-prompt.ts（伺服器端專用），不打包進瀏覽器

export const BLOOD_TEST_METRICS = ['bun', 'creatinine', 'sdma', 'phosphorus', 'hct'] as const
export type BloodTestMetric = (typeof BLOOD_TEST_METRICS)[number]

// structured output 限制「可為 null 或聯集型別的參數」最多 16 個（API 實測回傳的錯誤訊息），
// 所以只有數值用 null 表示「沒有」；文字欄位改用空字串，收到後再轉回 null，後續程式不受影響
const blankAsNull = z.string().transform((text) => (text.trim() === '' ? null : text))

const ExtractedValueSchema = z.object({
  value: z.number().nullable(),
  unit: blankAsNull,
  sourceLabel: blankAsNull
})

export type ExtractedValue = z.infer<typeof ExtractedValueSchema>

export const BloodTestExtractionSchema = z.object({
  isBloodTestReport: z.boolean(),
  testDate: blankAsNull,
  hospitalName: blankAsNull,
  bun: ExtractedValueSchema,
  creatinine: ExtractedValueSchema,
  sdma: ExtractedValueSchema,
  phosphorus: ExtractedValueSchema,
  hct: ExtractedValueSchema
})

export type BloodTestExtraction = z.infer<typeof BloodTestExtractionSchema>

// 每個指標接受的單位（正規化後比對：去除空白、轉小寫）。單位不同一律不預填，也不換算：
// 換算係數一旦用錯，數值會差到幾十倍，代價太高（ADR-010）
const ACCEPTED_UNITS: Record<BloodTestMetric, { expected: string; accepted: string[] }> = {
  bun: { expected: 'mg/dL', accepted: ['mg/dl'] },
  creatinine: { expected: 'mg/dL', accepted: ['mg/dl'] },
  // µ（U+00B5 micro sign）與 μ（U+03BC 希臘字母 mu）在報告上都會出現
  sdma: { expected: 'ug/dL', accepted: ['ug/dl', 'µg/dl', 'μg/dl'] },
  phosphorus: { expected: 'mg/dL', accepted: ['mg/dl'] },
  hct: { expected: '%', accepted: ['%'] }
}

function normalizeUnit(unit: string): string {
  return unit.replace(/\s+/g, '').toLowerCase()
}

export type MetricPrefill =
  | { status: 'filled'; value: number; unit: string; sourceLabel: string | null }
  | { status: 'missing' }
  | { status: 'no_unit' }
  | { status: 'unit_mismatch'; unit: string; expectedUnit: string }
  | { status: 'out_of_range'; value: number }

export type BloodTestPrefill = {
  isBloodTestReport: boolean
  testDate: string | undefined
  hospitalName: string | undefined
  metrics: Record<BloodTestMetric, MetricPrefill>
}

function toMetricPrefill(metric: BloodTestMetric, extracted: ExtractedValue): MetricPrefill {
  if (extracted.value === null || !Number.isFinite(extracted.value)) return { status: 'missing' }
  if (extracted.unit === null || extracted.unit.trim() === '') return { status: 'no_unit' }

  const { expected, accepted } = ACCEPTED_UNITS[metric]
  if (!accepted.includes(normalizeUnit(extracted.unit))) {
    return { status: 'unit_mismatch', unit: extracted.unit.trim(), expectedUnit: expected }
  }

  // 沿用表單本身的數值範圍（例如肌酸酐大於 0、最多 30），不另外定義一套
  if (!BloodTestSchema.shape[metric].safeParse(extracted.value).success) {
    return { status: 'out_of_range', value: extracted.value }
  }

  return {
    status: 'filled',
    value: extracted.value,
    unit: extracted.unit.trim(),
    sourceLabel: extracted.sourceLabel?.trim() || null
  }
}

function toTestDate(testDate: string | null, today: string): string | undefined {
  if (testDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(testDate)) return undefined
  if (!isValidCalendarDate(testDate)) return undefined
  // YYYY-MM-DD 可以直接用字串比較先後；晚於今天的日期一定是辨識錯誤
  if (testDate > today) return undefined
  return testDate
}

function toHospitalName(hospitalName: string | null): string | undefined {
  const trimmed = hospitalName?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 30)
}

const EMPTY_METRICS: Record<BloodTestMetric, MetricPrefill> = {
  bun: { status: 'missing' },
  creatinine: { status: 'missing' },
  sdma: { status: 'missing' },
  phosphorus: { status: 'missing' },
  hct: { status: 'missing' }
}

// today 為 YYYY-MM-DD，用來擋掉辨識成未來日期的 testDate
export function toBloodTestPrefill(
  extraction: BloodTestExtraction,
  today: string
): BloodTestPrefill {
  if (!extraction.isBloodTestReport) {
    return {
      isBloodTestReport: false,
      testDate: undefined,
      hospitalName: undefined,
      metrics: EMPTY_METRICS
    }
  }

  return {
    isBloodTestReport: true,
    testDate: toTestDate(extraction.testDate, today),
    hospitalName: toHospitalName(extraction.hospitalName),
    metrics: {
      bun: toMetricPrefill('bun', extraction.bun),
      creatinine: toMetricPrefill('creatinine', extraction.creatinine),
      sdma: toMetricPrefill('sdma', extraction.sdma),
      phosphorus: toMetricPrefill('phosphorus', extraction.phosphorus),
      hct: toMetricPrefill('hct', extraction.hct)
    }
  }
}
