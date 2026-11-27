import {
  BLOOD_TEST_METRICS,
  type BloodTestMetric,
  type BloodTestPrefill,
  type MetricPrefill
} from '@/lib/ai/blood-test-extraction'

// 決定 AI 辨識結果要填進表單的哪些欄位、每個欄位下方顯示什麼說明。
// 純函式，不碰 react-hook-form，方便測試「只填空白欄位」這條規則
// （見 docs/01-requirements/blood-test.md 的 AI 血檢報告辨識）

export type PrefillField = BloodTestMetric | 'testDate' | 'hospitalName'

// 選填欄位沒填時可能根本不在 values 裡，所以全部標成可省略
export type CurrentFormValues = Partial<Record<BloodTestMetric, unknown>> & {
  testDate?: unknown
  hospitalName?: unknown
  // 檢驗日期預設是今天，不是空白，所以用「使用者有沒有改過」判斷能不能覆蓋
  isTestDateDirty: boolean
}

export type PrefillPlan = {
  values: Partial<Record<BloodTestMetric, number>> & { testDate?: string; hospitalName?: string }
  notes: Partial<Record<PrefillField, string>>
}

// SDMA、HCT 是選填，很多報告本來就沒有，沒辨識到時不顯示說明，避免畫面上一堆「未辨識到」
const OPTIONAL_METRICS: readonly BloodTestMetric[] = ['sdma', 'hct']

export const AI_FILLED_NOTE = 'AI 辨識，請對照報告核對'

export function describeMetricPrefill(prefill: MetricPrefill): string {
  switch (prefill.status) {
    case 'filled':
      return `${AI_FILLED_NOTE}（報告上為 ${prefill.sourceLabel ?? '未標示名稱'}，${prefill.unit}）`
    case 'missing':
      return '未辨識到，請手動輸入'
    case 'no_unit':
      return '報告上沒有標示單位，請對照報告手動輸入'
    case 'unit_mismatch':
      return `報告使用 ${prefill.unit}，請自行換算成 ${prefill.expectedUnit} 後填入`
    case 'out_of_range':
      return '辨識到的數值超出合理範圍，請對照報告手動輸入'
  }
}

// 空字串是文字欄位沒填，NaN 是 valueAsNumber 的數字欄位沒填
function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'number' && Number.isNaN(value))
  )
}

export function planPrefill(prefill: BloodTestPrefill, current: CurrentFormValues): PrefillPlan {
  const plan: PrefillPlan = { values: {}, notes: {} }

  for (const metric of BLOOD_TEST_METRICS) {
    // 已經填過或改過的欄位一律不動，包括它原本的說明
    if (!isBlank(current[metric])) continue

    const metricPrefill = prefill.metrics[metric]
    if (metricPrefill.status === 'filled') plan.values[metric] = metricPrefill.value
    if (metricPrefill.status === 'missing' && OPTIONAL_METRICS.includes(metric)) continue
    plan.notes[metric] = describeMetricPrefill(metricPrefill)
  }

  if (prefill.testDate !== undefined && !current.isTestDateDirty) {
    plan.values.testDate = prefill.testDate
    plan.notes.testDate = AI_FILLED_NOTE
  }

  if (prefill.hospitalName !== undefined && isBlank(current.hospitalName)) {
    plan.values.hospitalName = prefill.hospitalName
    plan.notes.hospitalName = AI_FILLED_NOTE
  }

  return plan
}
