import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseEnv } from './env'

// 給 Server Component / Server Action / Route Handler 用的 Supabase client。
// 每次 request 都要重新建立一個新的 client，不能共用同一個實例。
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // 在 Server Component 裡呼叫 set 本來就會失敗（回應已經開始串流），
          // 只要 proxy.ts 有正確刷新 session，這裡失敗可以安全忽略。
        }
      }
    }
  })
}
