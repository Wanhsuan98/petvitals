export const OFFLINE_MESSAGE = '目前沒有網路連線，資料尚未儲存，請連線後再送出'
export const NETWORK_ERROR_MESSAGE = '網路連線中斷，資料尚未儲存，請確認連線後再試一次'
export const OFFLINE_DELETE_MESSAGE = '目前沒有網路連線，紀錄尚未刪除，請連線後再試'
export const NETWORK_DELETE_ERROR_MESSAGE = '網路連線中斷，紀錄尚未刪除，請確認連線後再試一次'

type ActionState = { status: 'idle' | 'error' | 'success'; message?: string }

// Server Action 在網路中斷時會直接 reject，而 useActionState 會把 reject 往上拋給 error boundary，
// 整頁換成錯誤畫面、使用者剛填的內容也跟著消失。包一層把網路失敗轉成表單看得到的錯誤訊息。
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
      return { ...prevState, status: 'error', message: NETWORK_ERROR_MESSAGE }
    }
  }
}
