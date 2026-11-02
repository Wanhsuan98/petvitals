import { headers } from 'next/headers'

// 正式環境設定 NEXT_PUBLIC_SITE_URL 後，就不再信任任何 request header，
// 避免有心人偽造 Host/Origin header，讓 Auth email 的連結帶出非預期的導轉目標。
export async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    // 只取 origin：環境變數多打了結尾斜線（https://x.app/）時，
    // 直接拼接會變成 https://x.app//auth/callback，不在 Supabase 白名單裡導致登入失敗
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
  }

  const headersList = await headers()
  const origin = headersList.get('origin')
  if (origin) return origin

  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? 'https'
  return `${protocol}://${host}`
}
