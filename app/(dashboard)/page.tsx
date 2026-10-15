import type { SupabaseClient } from '@supabase/supabase-js'

import { listDailyCareLogs } from '@/lib/data/daily-care-logs'
import { countPendingInvitationsForUser } from '@/lib/data/pet-caregivers'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { DashboardHomeClient } from './dashboard-home-client'

// 鈴鐺角標只是輔助資訊：查詢失敗時降級成 0，不能讓打卡與今日狀態跟著整頁壞掉。
// 對 owner 而言首頁原本完全不會碰 pet_caregivers，而這張表的 RLS 發生過無限遞迴事故
async function getPendingInvitationCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    return await countPendingInvitationsForUser(supabase, userId)
  } catch (error) {
    console.error('讀取待處理邀請數失敗，首頁角標先不顯示', error)
    return 0
  }
}

export default async function DashboardHomePage() {
  const { supabase, catProfile, userId } = await requireCatProfile()
  const [dailyCareLogs, pendingInvitationCount] = await Promise.all([
    listDailyCareLogs(supabase, catProfile.id),
    getPendingInvitationCount(supabase, userId)
  ])

  return (
    <DashboardHomeClient
      catProfile={catProfile}
      dailyCareLogs={dailyCareLogs}
      pendingInvitationCount={pendingInvitationCount}
    />
  )
}
