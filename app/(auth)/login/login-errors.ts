// 登入流程失敗時會被導回 /login?error=<代碼>，代碼來源：
// auth_callback_failed → app/auth/callback/route.ts（沒有 code，或 code 換 session 失敗）
// google_oauth_failed → ./actions.ts 的 signInWithGoogle（無法取得 Google 登入網址）
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  // 最常見的原因是 PKCE：魔法連結只能在發起登入的同一個瀏覽器完成，
  // iPhone 主畫面的 App 發起登入、信件連結卻在 Safari 打開時就會失敗
  auth_callback_failed:
    '登入沒有完成：登入連結可能已過期、已經用過，或是在不同的瀏覽器開啟。請重新登入；用 Email 登入時，請在同一個瀏覽器打開信件裡的連結。',
  google_oauth_failed: 'Google 登入暫時無法使用，請稍後再試，或改用 Email 登入連結。'
}

// 網址參數可以被任意竄改：只顯示已知代碼對應的固定文字，不把參數內容顯示在畫面上
export function getLoginErrorMessage(code: string | string[] | undefined): string | undefined {
  if (typeof code !== 'string') return undefined
  return LOGIN_ERROR_MESSAGES[code]
}
