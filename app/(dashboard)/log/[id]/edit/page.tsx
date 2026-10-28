import { notFound } from 'next/navigation'
import { z } from 'zod'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { getDailyCareLog } from '@/lib/data/daily-care-logs'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { DailyCareLogForm } from '../../daily-care-log-form'

export default async function EditDailyCareLogPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, catProfile } = await requireCatProfile()

  if (!z.string().uuid().safeParse(id).success) notFound()

  const dailyCareLog = await getDailyCareLog(supabase, id)
  // RLS 已經擋掉別人的貓，這裡再比對一次是避免網址帶到「自己有權限但不是目前這隻貓」的紀錄
  if (!dailyCareLog || dailyCareLog.petId !== catProfile.id) notFound()

  return (
    <div className="space-y-4">
      <PageHeader title="編輯打卡紀錄" backHref="/log" />
      <Card>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            只能修改內容；打卡時間與所屬日期不會改變。
          </p>
          <DailyCareLogForm
            dailyCareLog={dailyCareLog}
            prescribedSubQFluidMl={catProfile.subQFluidPrescribedMl}
          />
        </CardContent>
      </Card>
    </div>
  )
}
