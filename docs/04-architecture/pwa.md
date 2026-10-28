# PWA

Status: Implemented
Introduced: v1.0.0

## Manifest

`app/manifest.ts`：`display: standalone`，圖示為單一 SVG icon。

## Service Worker

`public/sw.js`：策略為「網路優先，失敗才回退快取」——確保打卡等資料永遠讀寫最新的網路回應，只快取成功的 GET 回應，離線時只能瀏覽先前造訪過的頁面。

## 離線行為邊界

- ✅ 支援：離線瀏覽先前快取過的頁面（歷史資料、圖表）。
- ❌ 不支援：離線打卡寫入。離線時打卡、血檢的新增與編輯表單上方會顯示「目前沒有網路連線」提示；送出時若離線會直接擋下（不送請求），連線中途斷掉造成的 Server Action 失敗也會轉成表單上的錯誤訊息（此時無法確認伺服器是否已寫入，訊息只說「無法確認是否已儲存、請重新整理確認」，不說「尚未儲存」，避免使用者重送造成重複紀錄），不會整頁跳到錯誤畫面、也不會清掉剛填的內容（`lib/network-error.ts` 的 `withNetworkErrorFallback`）。刪除確認同樣有離線檢查。`navigator.onLine` 只代表有連上網路、不保證連得到伺服器，所以兩層都需要。這是刻意的範疇邊界，不是遺漏——背景同步佇列（Background Sync／IndexedDB）複雜度較高，排入 [../00-product/roadmap.md](../00-product/roadmap.md)，目前不實作。

## 離線快取與個資（v1.2）

Service Worker 的快取不分使用者，裡面存著先前瀏覽過的頁面（含貓咪病歷）。為避免同一台裝置換人登入時讀到上一位使用者的資料，`lib/offline-cache.ts` 的 `clearOfflineCache()` 會刪除所有 `petvitals-` 開頭的快取，呼叫時機：

- 設定頁按「登出」時，先清快取再登出。
- 進入登入頁時再清一次（涵蓋登入過期、沒有按登出就被導回登入頁的情況）。

## 與主動提醒排程的關係（v1.2）

`public/sw.js` 已實作 `push`（顯示通知，並以 `deliveryId` 回報 `POST /api/push/ack`）與 `notificationclick`（優先聚焦已開啟的分頁）事件監聽，見 [../01-requirements/notification.md](../01-requirements/notification.md)。
