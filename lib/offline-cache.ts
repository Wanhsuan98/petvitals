// 跟 public/sw.js 的 CACHE_NAME 前綴一致。Service Worker 的快取不分使用者，裡面存著先前
// 瀏覽過的頁面（含貓咪病歷），換人登入同一台裝置前一定要清掉，否則可能讀到上一位使用者的資料
const OFFLINE_CACHE_PREFIX = 'petvitals-'

export async function clearOfflineCache(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX)).map((key) => caches.delete(key))
    )
  } catch (error) {
    // 清除失敗不能擋住登出，只記錄下來
    console.error('[offline-cache] 清除離線快取失敗', error)
  }
}
