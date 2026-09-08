import { createBrowserClient } from '@supabase/ssr'

import { getSupabaseEnv } from './env'

// 給 Client Component 用的 Supabase client（瀏覽器端，session 存在 cookie 裡）
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
