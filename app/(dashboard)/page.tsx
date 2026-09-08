import { listDailyCareLogs } from '@/lib/data/daily-care-logs'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { DashboardHomeClient } from './dashboard-home-client'

export default async function DashboardHomePage() {
  const { supabase, catProfile } = await requireCatProfile()
  const dailyCareLogs = await listDailyCareLogs(supabase, catProfile.id)

  return <DashboardHomeClient catProfile={catProfile} dailyCareLogs={dailyCareLogs} />
}
