import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './env'

// 只給「沒有使用者 session 的 server-to-server webhook」用（例如 ECPay 付款結果通知）。
// 這個 client 會略過 RLS，安全性改由呼叫端「先驗證 CheckMacValue 簽章」把關，
// 絕對不要在有使用者 session 的一般頁面/Server Action 裡使用這個 client。
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
