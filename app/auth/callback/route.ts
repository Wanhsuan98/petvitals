import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Magic Link / Google OAuth 完成後，Supabase 會把使用者導回這個網址並帶上 ?code=...，
// 這裡負責用 code 換取實際的登入 session（PKCE flow）。
// 登入後一律回首頁，刻意不接受 ?next= 之類的導向參數：站內沒有任何地方需要它，
// 而「只允許站內路徑」的檢查很容易被繞過（例如 /\evil.com 會被瀏覽器解析成 //evil.com），
// 不收這個參數就從根本上不會有開放重導向（open redirect）的問題
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
