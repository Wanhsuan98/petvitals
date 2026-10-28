# PWA

Status: Implemented
Introduced: v1.0.0

## Manifest

`app/manifest.ts`：`display: standalone`，圖示為單一 SVG icon。

## Service Worker

`public/sw.js`：策略為「網路優先，失敗才回退快取」——確保打卡等資料永遠讀寫最新的網路回應，只快取成功的 GET 回應，離線時只能瀏覽先前造訪過的頁面。

## 離線行為邊界

- ✅ 支援：離線瀏覽先前快取過的頁面（歷史資料、圖表）。
- ❌ 不支援：離線打卡寫入。這是刻意的範疇邊界，不是遺漏——背景同步佇列（Background Sync／IndexedDB）複雜度較高，排入 [../00-product/roadmap.md](../00-product/roadmap.md)，目前不實作。

## 離線快取與個資（v1.2）

Service Worker 的快取不分使用者，裡面存著先前瀏覽過的頁面（含貓咪病歷）。為避免同一台裝置換人登入時讀到上一位使用者的資料，`lib/offline-cache.ts` 的 `clearOfflineCache()` 會刪除所有 `petvitals-` 開頭的快取，呼叫時機：

- 設定頁按「登出」時，先清快取再登出。
- 進入登入頁時再清一次（涵蓋登入過期、沒有按登出就被導回登入頁的情況）。

## 與主動提醒排程的關係（v1.2）

`public/sw.js` 已實作 `push`（顯示通知）與 `notificationclick`（優先聚焦已開啟的分頁）事件監聽，見 [../01-requirements/notification.md](../01-requirements/notification.md)。
