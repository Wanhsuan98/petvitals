// VAPID 金鑰跟 ECPay 的金鑰不同，不是可以拿來偽造金流的機密，但私鑰外洩後任何人
// 都能冒充 PetVitals 對使用者的瀏覽器發推播，所以一樣只在 server 端讀取。
export function getPushEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      '缺少 Web Push 環境變數，請確認已設定 NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT'
    )
  }

  return { publicKey, privateKey, subject }
}

// GitHub Actions 排程打 api/cron/send-reminders 時帶的共用密鑰，
// 因為這個 route 現在是公開可觸達的 URL（不像 Vercel Cron 有內建的呼叫端身分驗證）
export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error('缺少環境變數 CRON_SECRET，請確認已設定')
  }
  return secret
}
