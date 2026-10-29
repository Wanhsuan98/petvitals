import { PageHeader } from '@/components/page-header'
import { parseRecordsPeriod } from '@/lib/records-period'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { BloodTestForm } from '../blood-test-form'

export default async function NewBloodTestPage({
  searchParams
}: {
  searchParams: Promise<{ range?: string | string[] }>
}) {
  await requireCatProfile()
  // 跟編輯頁一樣：返回與儲存後都回到原本的時間篩選，只接受合法的篩選值
  const { range } = await searchParams
  const recordsHref = `/records?range=${parseRecordsPeriod(typeof range === 'string' ? range : null)}`

  return (
    <div className="space-y-4">
      <PageHeader title="新增血檢紀錄" backHref={recordsHref} />
      <BloodTestForm returnHref={recordsHref} />
    </div>
  )
}
