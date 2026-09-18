# Roadmap

Status: Living document
Last Updated: v1.2.0

這份文件只放「還沒做」的前瞻規劃。已完成的交付時程請見 [../06-releases/](../06-releases/)。

## 多隻貓咪管理（訂閱 Pro，架構已預留）

`cat_profiles` 目前有 `unique (owner_id)` 約束，資料庫層級鎖死一人一貓。若未來要開放多貓：

1. 移除 `cat_profiles_owner_id_key` 這條 unique constraint。
2. 應用層改用訂閱狀態判斷貓咪數量上限（免費版持續限制 1 隻，Pro 版開放到一個待訂數字，例如 3 隻，與協作者上限一致好記，實際數字屆時再拍板）。
3. 前端需新增貓咪切換 UI（目前所有頁面隱含「使用者只有一隻貓」，`requireCatProfile()` 等輔助函式需要改為接受 `petId` 參數而非隱含推斷）。

決策脈絡見 [ADR-001](../05-decisions/ADR-001-single-cat-mvp.md)。目前不需要動 migration，只需要保留這個路徑不被架構卡死。

## LINE 整合（未排入時程）

LINE Notify 已於 2025/3/31 停止服務。未來如需 LINE 通知，須改走 LINE Messaging API 官方帳號，需另行申請與審核。對台灣使用者可能有價值，但目前沒有排入任何版本，需要先評估申請流程與維運成本。

## PWA 離線寫入背景同步（未排入時程）

目前離線時只能瀏覽快取內容，無法離線打卡。若要支援離線打卡並於恢復連線後同步，需要 Background Sync／IndexedDB 佇列機制，複雜度較高，暫不排入近期版本。
