// 送出前就已經離線：請求根本沒發出去，可以確定「尚未儲存」
export const OFFLINE_MESSAGE = '目前沒有網路連線，資料尚未儲存，請連線後再送出'
export const OFFLINE_DELETE_MESSAGE = '目前沒有網路連線，紀錄尚未刪除，請連線後再試'
// 送出途中失敗：用戶端分不出「請求沒送到」與「伺服器已經寫入、只是回應沒收到」，
// 不能說「尚未儲存」，否則使用者照著重送會多出一筆重複打卡、灌高當日達成度
export const UNCERTAIN_RESULT_MESSAGE =
  '連線中斷，無法確認是否已儲存。請重新整理頁面確認紀錄後，再決定是否重新送出'
export const UNCERTAIN_DELETE_MESSAGE = '連線中斷，無法確認是否已刪除，請重新整理頁面確認'

type ActionState = { status: 'idle' | 'error' | 'success'; message?: string }

// Server Action 在網路中斷時會直接 reject，而 useActionState 會把 reject 往上拋給 error boundary，
// 整頁換成錯誤畫面、使用者剛填的內容也跟著消失。包一層把失敗轉成表單看得到的錯誤訊息。
// 伺服器端未預期的例外也會走到 catch，所以訊息不斷言是網路問題，只說無法確認結果。
// 離線時連請求都不送：PWA 沒有背景同步，送了也只會失敗（見 docs/04-architecture/pwa.md）
export function withNetworkErrorFallback<TState extends ActionState, TInput>(
  action: (prevState: TState, input: TInput) => Promise<TState>
): (prevState: TState, input: TInput) => Promise<TState> {
  return async (prevState, input) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ...prevState, status: 'error', message: OFFLINE_MESSAGE }
    }
    try {
      return await action(prevState, input)
    } catch (error) {
      console.error('[network] Server Action 失敗', error)
      return { ...prevState, status: 'error', message: UNCERTAIN_RESULT_MESSAGE }
    }
  }
}
