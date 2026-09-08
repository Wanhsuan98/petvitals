import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16 把 middleware.ts 改名為 proxy.ts（連 export 的函式名稱也改了），
// 這裡沿用官方 Supabase + Next.js 範例的 session 刷新邏輯，只是換了檔名/匯出名稱。
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
