'use server'

import { redirect } from 'next/navigation'
import type { AuthError } from '@supabase/supabase-js'

import { getSiteOrigin } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'

export type MagicLinkState = {
  status: 'idle' | 'error' | 'sent'
  message?: string
}

// 已知的 Supabase Auth 錯誤代碼對應中文訊息，未列出的一律顯示通用訊息，
// 避免把上游錯誤細節原封不動顯示給使用者。
const ERROR_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit: '請求太頻繁，請稍後再試',
  email_address_invalid: '請輸入有效的 Email 地址',
  signup_disabled: '目前未開放註冊新帳號'
}

function toFriendlyMessage(error: AuthError): string {
  return ERROR_MESSAGES[error.code ?? ''] ?? '登入連結寄送失敗，請稍後再試'
}

export async function signInWithMagicLink(
  _prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: '請輸入有效的 Email 地址' }
  }

  const supabase = await createClient()
  const origin = await getSiteOrigin()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` }
  })

  if (error) {
    return { status: 'error', message: toFriendlyMessage(error) }
  }

  return { status: 'sent', message: `登入連結已寄到 ${email}，請至信箱點擊連結完成登入。` }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = await getSiteOrigin()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` }
  })

  if (error || !data.url) {
    redirect('/login?error=google_oauth_failed')
  }

  redirect(data.url)
}
