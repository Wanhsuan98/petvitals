import { PageHeader } from '@/components/page-header'
import { getRemainingAiUsage } from '@/lib/data/ai-usage'
import { parseRecordsPeriod } from '@/lib/records-period'
import { requireCatProfile } from '@/lib/require-cat-profile'
import { toTaipeiDateString } from '@/lib/utils'

import { BloodTestForm } from '../blood-test-form'

// 頁面上的 Server Action（AI 辨識報告）最長執行時間。AI client 的逾時設為 45 秒，
// 比這裡短，讓逾時能被程式接住並記為 FAILED，而不是被平台直接中斷
export const maxDuration = 60

export default async function NewBloodTestPage({
  searchParams
}: {
  searchParams: Promise<{ range?: string | string[] }>
}) {
  const { supabase, catProfile } = await requireCatProfile()
  // 跟編輯頁一樣：返回與儲存後都回到原本的時間篩選，只接受合法的篩選值
  const { range } = await searchParams
  const recordsHref = `/records?range=${parseRecordsPeriod(typeof range === 'string' ? range : null)}`

  // 查不到剩餘次數時不顯示次數，辨識功能照常可用（伺服器端仍會檢查上限）
  let initialRemaining: number | undefined
  try {
    initialRemaining = await getRemainingAiUsage(
      supabase,
      catProfile.id,
      'BLOOD_TEST_EXTRACTION',
      toTaipeiDateString(new Date())
    )
  } catch (error) {
    console.error('[ai] 讀取辨識剩餘次數失敗', error instanceof Error ? error.message : error)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="新增血檢紀錄" backHref={recordsHref} />
      <BloodTestForm returnHref={recordsHref} aiExtraction={{ initialRemaining }} />
    </div>
  )
}
