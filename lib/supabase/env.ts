// 集中驗證 Supabase 環境變數，缺值時丟出清楚的錯誤訊息，
// 避免直接用 `!` 斷言，讓錯誤在 supabase-js 內部變成難懂的 runtime error。
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('缺少環境變數 NEXT_PUBLIC_SUPABASE_URL，請確認 .env.local 是否已設定')
  }
  if (!anonKey) {
    throw new Error('缺少環境變數 NEXT_PUBLIC_SUPABASE_ANON_KEY，請確認 .env.local 是否已設定')
  }

  return { url, anonKey }
}
