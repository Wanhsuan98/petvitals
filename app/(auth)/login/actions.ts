'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthError } from '@supabase/supabase-js'

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

async function getOrigin(): Promise<string> {
  // 正式環境設定 NEXT_PUBLIC_SITE_URL 後，就不再信任任何 request header，
  // 避免有心人偽造 Host/Origin header 讓 Auth email 帶出非預期的導轉網址。
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  const headersList = await headers()
  const origin = headersList.get('origin')
  if (origin) return origin

  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? 'https'
  return `${protocol}://${host}`
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
  const origin = await getOrigin()

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
  const origin = await getOrigin()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` }
  })

  if (error || !data.url) {
    redirect('/login?error=google_oauth_failed')
  }

  redirect(data.url)
}
