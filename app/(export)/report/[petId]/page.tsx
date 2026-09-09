import { redirect } from 'next/navigation'

import { listBloodTests } from '@/lib/data/blood-tests'
import { listDailyCareLogs } from '@/lib/data/daily-care-logs'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { ReportView } from './report-view'

// 獸醫回診專用 A4 橫式列印佈局
export default async function ReportPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const { supabase, catProfile } = await requireCatProfile()

  // 目前一位使用者僅對應一隻貓，網址帶的 petId 只會用來對齊正確的網址，不會拿去查詢別人的資料
  if (petId !== catProfile.id) {
    redirect(`/report/${catProfile.id}`)
  }

  const [dailyCareLogs, bloodTests] = await Promise.all([
    listDailyCareLogs(supabase, catProfile.id),
    listBloodTests(supabase, catProfile.id)
  ])

  return (
    <ReportView catProfile={catProfile} dailyCareLogs={dailyCareLogs} bloodTests={bloodTests} />
  )
}
