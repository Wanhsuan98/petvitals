import { listDailyCareLogs } from '@/lib/data/daily-care-logs'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { LogForm } from './log-form'

export default async function LogPage() {
  const { supabase, catProfile } = await requireCatProfile()
  const dailyCareLogs = await listDailyCareLogs(supabase, catProfile.id)

  return <LogForm dailyCareLogs={dailyCareLogs} />
}
