import { listBloodTests } from '@/lib/data/blood-tests'
import { listDailyCareLogs } from '@/lib/data/daily-care-logs'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { RecordsClient } from './records-client'

export default async function RecordsPage() {
  const { supabase, catProfile } = await requireCatProfile()
  const [dailyCareLogs, bloodTests] = await Promise.all([
    listDailyCareLogs(supabase, catProfile.id),
    listBloodTests(supabase, catProfile.id)
  ])

  return (
    <RecordsClient catProfile={catProfile} dailyCareLogs={dailyCareLogs} bloodTests={bloodTests} />
  )
}
