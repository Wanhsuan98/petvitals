import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getCatProfile } from '@/lib/data/cat-profile'
import { createClient } from '@/lib/supabase/server'
import type { CatProfile } from '@/lib/schemas'

// 每個需要貓咪資料才能運作的頁面（打卡、血檢紀錄...）共用的前置檢查：
// 沒登入就導去 /login（理論上 proxy.ts 已擋過，這裡是雙重保險）；
// 已登入但還沒建立貓咪資料，就導去 /settings 先完成建檔。
export async function requireCatProfile(): Promise<{
  supabase: SupabaseClient
  catProfile: CatProfile
}> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const catProfile = await getCatProfile(supabase, user.id)
  if (!catProfile) redirect('/settings')

  return { supabase, catProfile }
}
