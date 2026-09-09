import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// next 參數必須是站內相對路徑，避免被拿來做開放重導向（open redirect）攻擊
function isSafeRedirectTarget(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

// Magic Link / Google OAuth 完成後，Supabase 會把使用者導回這個網址並帶上 ?code=...，
// 這裡負責用 code 換取實際的登入 session（PKCE flow）。
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const rawNext = request.nextUrl.searchParams.get('next') ?? '/'
  const next = isSafeRedirectTarget(rawNext) ? rawNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
