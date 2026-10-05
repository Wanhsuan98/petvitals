import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './env'

// 只給「沒有使用者 session 的 server-to-server 呼叫」用（例如 cron 推播排程、
// 邀請協作者時查詢 auth.users）。這個 client 會略過 RLS，安全性改由呼叫端自行把關
// （例如驗證共用密鑰），絕對不要在有使用者 session 的一般頁面/Server Action 裡使用。
export function createServiceRoleClient() {
  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('缺少環境變數 SUPABASE_SERVICE_ROLE_KEY，請確認 .env.local 是否已設定')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
