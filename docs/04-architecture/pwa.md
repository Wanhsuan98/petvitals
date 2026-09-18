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

## 與主動提醒排程的關係（規劃中，v1.2）

Web Push 需要 Service Worker 註冊 `push` 事件監聽器，目前 `public/sw.js` 尚未實作這段。這是 [../01-requirements/notification.md](../01-requirements/notification.md) 動工時需要一併補上的部分，不是現有 Service Worker 就自動支援的能力。
